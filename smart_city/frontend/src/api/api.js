import axios from 'axios';

let envUrl = import.meta.env.VITE_REACT_APP_API_URL || 'http://127.0.0.1:8000';

if (envUrl && !envUrl.endsWith('/api')) {
  envUrl += '/api';
}

const BASE_URL = envUrl;

console.log("API BASE URL:", BASE_URL);

let isDemoMode = false;

export const setDemoMode = (enabled) => {
  isDemoMode = enabled;
};

export const getDemoMode = () => isDemoMode;

const apiAxios = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    accept: 'application/json',
  },
});

apiAxios.interceptors.request.use((config) => {
  console.log(
    "API REQUEST:",
    config.method?.toUpperCase(),
    `${config.baseURL}${config.url}`,
    config.data || ""
  );

  return config;
});

apiAxios.interceptors.response.use(
  (response) => {
    console.log("API RESPONSE:", response.config.url, response.data);
    return response;
  },
  (error) => {
    const detail = error.response?.data || error.message;

    console.error(
      "API ERROR:",
      error.config?.url,
      JSON.stringify(detail, null, 2)
    );

    return Promise.reject(error);
  }
);

const mockSensors = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  reference: `C-${(i + 1).toString().padStart(3, '0')}`,
  type_capteur: ['Air', 'Trafic', 'Energie', 'Dechets'][i % 4],
  localisation: `Secteur ${Math.floor(Math.random() * 15) + 1}`,
  etat: ['ACTIF', 'ACTIF', 'ACTIF', 'SIGNALÉ', 'HORS_SERVICE'][Math.floor(Math.random() * 5)],
}));

const mockInterventions = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  capteur_id: Math.floor(Math.random() * 50) + 1,
  vehicule_id: null,
  description: 'Maintenance requise',
  etat: ['DEMANDE', 'TECH1_ASSIGNÉ', 'IA_VALIDE'][Math.floor(Math.random() * 3)],
  date_creation: new Date().toISOString(),
}));

const mockVehicles = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  matricule: `NS-2030-${(i + 1).toString().padStart(3, '0')}`,
  etat: ['EN_ROUTE', 'STATIONNÉ', 'EN_PANNE'][Math.floor(Math.random() * 3)],
}));

const mockCitizens = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
}));

const mockTimeseries = Array.from({ length: 24 }, (_, i) => {
  const d = new Date();
  d.setHours(d.getHours() - (24 - i));

  return {
    bucket: d.toISOString(),
    avg_valeur: 40 + Math.random() * 40,
  };
});

const withMockFallback = async (requestFn, mockData) => {
  if (isDemoMode) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ data: mockData, isMock: true }), 500);
    });
  }

  try {
    return await requestFn();
  } catch (error) {
    console.warn("Backend request failed. Using mock data only for this request.");
    return { data: mockData, isMock: true };
  }
};

export const compilerApi = {
  compile: (query) => {
    return apiAxios.post('/compile', { query });
  },

  execute: (query) => {
    return apiAxios.post('/execute', { query });
  },
};

export const automataApi = {
  getState: (type, id) =>
    withMockFallback(() => apiAxios.get(`/automata/${type}/${id}`), {
      entity_type: type,
      entity_id: id,
      state: 'ACTIF',
    }),

  transition: (type, id, event) =>
    withMockFallback(() =>
      apiAxios.post('/automata/transition', {
        entity_type: type,
        entity_id: id,
        event,
      }),
    {
      message: "Transition successful",
      new_state: 'SIGNALÉ',
    }),
};

export const aiApi = {
  generateReport: (query) =>
    withMockFallback(() => apiAxios.post('/ai/report', { query }), {
      report:
        "Ceci est un rapport généré en mode démonstration. Les systèmes sont stables.\n\nActions recommandées :\n1. Vérifier le capteur C-042.\n2. Optimiser les trajets.",
    }),
};

export const dataApi = {
  getSensors: () => withMockFallback(() => apiAxios.get('/data/sensors'), mockSensors),
  getInterventions: () => withMockFallback(() => apiAxios.get('/data/interventions'), mockInterventions),
  getVehicles: () => withMockFallback(() => apiAxios.get('/data/vehicles'), mockVehicles),
  getCitizens: () => withMockFallback(() => apiAxios.get('/data/citizens'), mockCitizens),
  getTimeseries: () => withMockFallback(() => apiAxios.get('/data/timeseries'), mockTimeseries),
};

export default apiAxios;