const swe = require('swisseph');
const path = require('path');

// Configurações
swe.swe_set_ephe_path(path.join(__dirname, './ephe')); // Corrected function name
swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI); // Corrected function name

const nakshatras = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
  "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
  "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati"
];

const dashaSequence = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const dashaYears = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17
};

function rotateSequence(start) {
  const i = dashaSequence.indexOf(start);
  return [...dashaSequence.slice(i), ...dashaSequence.slice(0, i)];
}

function addYears(date, years) {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + Math.floor(years));
  const remMonths = Math.round((years % 1) * 12);
  result.setMonth(result.getMonth() + remMonths);
  return result;
}

function calculateMahadashaList(startLord, yearsRemaining, birthDate) {
  const rotated = rotateSequence(startLord);
  const list = [];
  let start = new Date(birthDate);
  let firstDuration = yearsRemaining;

  rotated.forEach((lord, i) => {
    const fullYears = dashaYears[lord];
    const duration = i === 0 ? firstDuration : fullYears;
    const end = addYears(start, duration);
    list.push({
      dashaLord: lord,
      duration: fullYears,
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10)
    });
    start = new Date(end);
  });

  return list;
}

function calculateAntardashas(majorLord, startDate) {
  const totalYears = dashaYears[majorLord];
  const antardashas = [];
  let start = new Date(startDate);

  for (const subLord of dashaSequence) {
    const proportion = dashaYears[subLord] / 120;
    const durationYears = +(totalYears * proportion);
    const end = addYears(start, durationYears);
    antardashas.push({
      dashaLord: majorLord,
      antardashaLord: subLord,
      durationYears: durationYears.toFixed(2),
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10)
    });
    start = new Date(end);
  }

  return antardashas;
}

function getPlanetName(code) {
  const names = {
    0: 'Sun', 1: 'Moon', 2: 'Mercury', 3: 'Venus',
    4: 'Mars', 5: 'Jupiter', 6: 'Saturn', 
    11: 'Rahu' // Usaremos o Nodo Verdadeiro (11) para Rahu
  };
  return names[code] || `Planet_${code}`;
}

exports.getVedicChart = (data) => new Promise((resolve, reject) => {
  const { year, month, day, hour, timezone, lat, lon } = data;
  const time = hour - timezone;

  // Validate latitude and longitude
  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
    return reject(new Error('Invalid or missing latitude. Must be a number between -90 and 90.'));
  }
  if (typeof lon !== 'number' || isNaN(lon) || lon < -180 || lon > 180) {
    return reject(new Error('Invalid or missing longitude. Must be a number between -180 and 180.'));
  }


  swe.swe_julday(year, month, day, time, swe.SE_GREG_CAL, (jd_ut) => {
    const planetCodes = [0, 1, 2, 3, 4, 5, 6, 11]; // Calcularemos Rahu (Nodo Verdadeiro)
    const chart = { planets: {} };
    let pending = planetCodes.length;

    planetCodes.forEach((pcode) => {
      swe.swe_calc_ut(jd_ut, pcode, swe.SEFLG_SIDEREAL, (res) => {
        if (res.error) {
          // Rejeitar a promessa principal e evitar processamento adicional
          return reject(new Error(`Swiss Ephemeris error for planet ${pcode}: ${res.error}`));
        }

        const deg = res.longitude;
        const nakIdx = Math.floor(deg / (360 / 27));
        const nakshatra = nakshatras[nakIdx];

        chart.planets[getPlanetName(pcode)] = {
          degree: deg.toFixed(2),
          nakshatra,
          signIndex: Math.floor(deg / 30)
        };

        if (--pending === 0) {
          // Obter a data UTC precisa a partir do Dia Juliano para os cálculos de Dasha
          swe.swe_revjul(jd_ut, swe.SE_GREG_CAL, (utcDateParts) => {
            if (utcDateParts.error) { // Supondo que swe_revjul pode retornar um erro
              return reject(new Error(utcDateParts.error || 'Failed to reverse Julian Day'));
            }

            const { year: utcYear, month: utcMonth, day: utcDay, hour: utcDecimalHour } = utcDateParts;
            const h = Math.floor(utcDecimalHour);
            const min = Math.floor((utcDecimalHour % 1) * 60);
            const sec = Math.round((((utcDecimalHour % 1) * 60) % 1) * 60);
            
            const actualBirthDateUTC = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, h, min, sec));

            const moonDeg = parseFloat(chart.planets.Moon.degree);
            const nakLength = 360 / 27;
            const moonNakIdx = Math.floor(moonDeg / nakLength); // Nakshatra da Lua
            const nakStart = moonNakIdx * nakLength;
            const passed = moonDeg - nakStart;
            const balance = 1 - (passed / nakLength);

            const mahaLord = dashaSequence[moonNakIdx % 9];
            const yearsRemaining = dashaYears[mahaLord] * balance;

            chart.nakshatra = nakshatras[moonNakIdx];
            chart.mahadasha = {
              current: {
                dashaLord: mahaLord,
                yearsRemaining: yearsRemaining.toFixed(2)
              },
              sequence: calculateMahadashaList(mahaLord, yearsRemaining, actualBirthDateUTC)
            };

            // Calcular Ketu (180 graus oposto a Rahu)
            // Certifique-se que Rahu foi calculado
            if (!chart.planets.Rahu || typeof chart.planets.Rahu.degree === 'undefined') {
              return reject(new Error('Falha ao calcular Rahu. Não é possível derivar Ketu.'));
            }
            const rahuDegree = parseFloat(chart.planets.Rahu.degree);
            const ketuDegree = (rahuDegree + 180) % 360;
            const ketuNakIdx = Math.floor(ketuDegree / (360 / 27));
            const ketuNakshatra = nakshatras[ketuNakIdx];
            const ketuSignIndex = Math.floor(ketuDegree / 30);

            chart.planets.Ketu = {
              degree: ketuDegree.toFixed(2),
              nakshatra: ketuNakshatra,
              signIndex: ketuSignIndex
            };

            // Inserir antardashas da primeira Mahadasha (a atual)
            // A data 'from' da primeira mahadasha agora será baseada na actualBirthDateUTC
            const firstDashaStartDate = new Date(chart.mahadasha.sequence[0].from);
            chart.mahadasha.sequence[0].antardashas = calculateAntardashas(mahaLord, firstDashaStartDate);

            // Ascendente
            swe.swe_get_ayanamsa_ut(jd_ut, (ayan) => {
              console.log(`Ayanamsa: ${ayan}`);

              swe.swe_houses(jd_ut, lat, lon, 'P', (houses) => {
                const tropicalAsc = houses.ascendant;
                console.log(`Tropical Ascendant: ${tropicalAsc}`);
                const siderealAsc = (tropicalAsc - ayan + 360) % 360;
                chart.ascendant = siderealAsc.toFixed(2);
                resolve(chart);
              });
            });
          });
        }
      });
    });
  });
});
