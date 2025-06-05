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
    10: 'Rahu', 11: 'Ketu'
  };
  return names[code] || `Planet_${code}`;
}

exports.getVedicChart = (data) => new Promise((resolve, reject) => {
  const { year, month, day, hour, timezone, lat, lon } = data;
  const time = hour - timezone;

  const birthDate = new Date(Date.UTC(year, month - 1, day, hour));
  swe.swe_julday(year, month, day, time, swe.SE_GREG_CAL, (jd_ut) => {
    const planetCodes = [0, 1, 2, 3, 4, 5, 6, 10, 11];
    const chart = { planets: {} };
    let pending = planetCodes.length;

    planetCodes.forEach((pcode) => {
      swe.swe_calc_ut(jd_ut, pcode, swe.SEFLG_SIDEREAL, (res) => {
        if (res.error) return reject(res.error);

        const deg = res.longitude;
        const nakIdx = Math.floor(deg / (360 / 27));
        const nakshatra = nakshatras[nakIdx];

        chart.planets[getPlanetName(pcode)] = {
          degree: deg.toFixed(2),
          nakshatra,
          signIndex: Math.floor(deg / 30)
        };

        if (--pending === 0) {
          const moonDeg = parseFloat(chart.planets.Moon.degree);
          const nakLength = 360 / 27;
          const nakIdx = Math.floor(moonDeg / nakLength);
          const nakStart = nakIdx * nakLength;
          const passed = moonDeg - nakStart;
          const balance = 1 - (passed / nakLength);

          const mahaLord = dashaSequence[nakIdx % 9];
          const yearsRemaining = dashaYears[mahaLord] * balance;

          chart.nakshatra = nakshatras[nakIdx];
          chart.mahadasha = {
            current: {
              dashaLord: mahaLord,
              yearsRemaining: yearsRemaining.toFixed(2)
            },
            sequence: calculateMahadashaList(mahaLord, yearsRemaining, birthDate)
          };

          // Inserir antardashas da primeira Mahadasha (a atual)
          const firstStart = new Date(chart.mahadasha.sequence[0].from);
          chart.mahadasha.sequence[0].antardashas = calculateAntardashas(mahaLord, firstStart);

          // Ascendente
          swe.swe_get_ayanamsa_ut(jd_ut, (ayan) => { // Corrected function name
            swe.swe_houses(jd_ut, lat, lon, 'P', (houses) => {
              const tropicalAsc = houses.ascendant;
              const siderealAsc = (tropicalAsc - ayan.ayanamsa + 360) % 360;
              chart.ascendant = siderealAsc.toFixed(2);
              resolve(chart);
            });
          });
        }
      });
    });
  });
});
