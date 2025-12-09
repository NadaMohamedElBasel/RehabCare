import API from "./axiosConfig";

export const getDoctorPatients = () => API.get("/doctor/patients");

export const getPatientDetails = (id) =>
  API.get(`/doctor/patient/${id}`);

export const getDoctorAppointments = () =>
  API.get("/doctor/appointments");

export const submitAnnotation = (data) =>
  API.post("/doctor/annotation", data);

export const getRadiologyScan = (scanId) =>
  API.get(`/doctor/radiology/${scanId}`);
