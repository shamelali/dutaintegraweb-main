import { onRequest as __api___path___js_onRequest } from "/media/shamelali/Data/1-Projects/dutaintegraweb-main/functions/api/[[path]].js"

export const routes = [
    {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___path___js_onRequest],
    },
  ]