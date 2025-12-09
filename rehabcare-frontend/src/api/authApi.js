import API from "./axiosConfig";

export const login = async (email, password) => {
  return API.post("/login", { email, password });
};

export const registerPatient = async (data) => {
  return API.post("/register", data);
};
