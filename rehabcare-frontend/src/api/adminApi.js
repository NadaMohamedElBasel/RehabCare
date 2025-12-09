import API from "./axiosConfig";

export const getUsers = () => API.get("/admin/users");
export const createUser = (data) => API.post("/admin/users", data);
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);

export const getDoctors = () => API.get("/admin/doctors");
export const getPatients = () => API.get("/admin/patients");

export const getAppointmentsAdmin = () =>
  API.get("/admin/appointments");

export const getBillingAdmin = () =>
  API.get("/admin/billing");

export const getSystemLogs = () =>
  API.get("/admin/system-logs");
