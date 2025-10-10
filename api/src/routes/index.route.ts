import memoryRouter from "./memory.route";

export const routes = (app: any) => {
  app.use("/api/memory", memoryRouter);
};
