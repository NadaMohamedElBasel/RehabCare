import API from "./axiosConfig";

export const getPatientProfile = (id) => API.get(`/patients/${id}`);

export const updatePatientProfile = (id, data) =>
  API.put(`/patients/${id}`, data);

export const getAppointments = (patientId) =>
  API.get(`/appointments/${patientId}`);

export const createAppointment = (data) =>
  API.post("/appointments", data);

export const getMedicalRecords = (patientId) =>
  API.get(`/medical-records/${patientId}`);

export const getPrescriptions = (patientId) =>
  API.get(`/prescriptions/${patientId}`);

export const getBilling = (patientId) =>
  API.get(`/billing/${patientId}`);
