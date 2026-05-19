import * as Tone from 'tone';

export const TOOLS_DECLARATIONS = {
  getWeather: {
    name: 'getWeather',
    description: '주어진 위도(latitude)와 경도(longitude)의 현재 날씨 정보를 가져옵니다.',
    parameters: {
      type: 'OBJECT',
      properties: {
        lat: { type: 'NUMBER', description: '위도 (예: 37.5665)' },
        lon: { type: 'NUMBER', description: '경도 (예: 126.9780)' }
      },
      required: ['lat', 'lon']
    }
  },
  getCountry: {
    name: 'getCountry',
    description: '국가명(영어)을 입력받아 해당 국가의 기본 정보를 가져옵니다.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: '국가명 (예: south korea, usa)' }
      },
      required: ['name']
    }
  },
  playMelody: {
    name: 'playMelody',
    description: '주어진 계이름(예: c4 e4 g4) 배열을 합성기(Synthesizer)로 연주합니다.',
    parameters: {
      type: 'OBJECT',
      properties: {
        notes: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: '연주할 음표 배열 (예: ["C4", "E4", "G4", "C5", "E5"])'
        }
      },
      required: ['notes']
    }
  }
};

export const executeTool = async (callName, args) => {
  switch (callName) {
    case 'getWeather': {
      const { lat, lon } = args;
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m&timezone=Asia/Seoul`);
        const data = await res.json();
        return { success: true, data: data.current_weather };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    case 'getCountry': {
      const { name } = args;
      try {
        const res = await fetch(`https://restcountries.com/v3.1/name/${name}`);
        const data = await res.json();
        if (data.status === 404) return { success: false, error: 'Not Found' };
        // Extract essential info
        const info = data[0];
        return { 
          success: true, 
          data: {
            name: info.name.common,
            capital: info.capital?.[0],
            region: info.region,
            population: info.population,
            flag: info.flags?.svg || info.flags?.png,
            flagEmoji: info.flag
          }
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    case 'playMelody': {
      const { notes } = args;
      try {
        await Tone.start();
        const synth = new Tone.Synth().toDestination();
        const now = Tone.now();
        notes.forEach((note, index) => {
          synth.triggerAttackRelease(note, "8n", now + index * 0.5);
        });
        return { success: true, message: `Played notes: ${notes.join(', ')}` };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    default:
      return { success: false, error: 'Unknown tool' };
  }
};
