import { createClient } from "@supabase/supabase-js";
import apiRouter, { RequestWrapper } from "./router";
import { Database } from "./database.types";
import { json } from "itty-router";

export interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
  OPENAI_API_KEY: string;
  OPENAI_ORG: string;
  HELICONE_API_KEY: string;
  OPEN_MOVIE_DATABASE_API_KEY: string;
  OPEN_MOVIE_DATABASE_URL: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      let url = new URL(request.url);
	  console.log(`URL ${url}`)
      if (url.pathname.startsWith('/api/')) {
        let requestWrapper = request as RequestWrapper;
        requestWrapper.env = env;
        requestWrapper.supabaseClient = createClient<Database>(env.SUPABASE_URL ?? '', env.SUPABASE_SERVICE_ROLE_KEY ?? '');

        return apiRouter
          .handle(requestWrapper)
          .then(json)
          .catch((error: any) => {
              return errorResponse(error);
          })
      }

	  throw new Error("Endpoint not found")
	} catch (error) {
      return errorResponse(error);
    }
  },
};

function errorResponse(error: any) {
	return new Response(
	  JSON.stringify({
		"filmwise-message": "FilmWise ran into an error servicing your request: " + error,
		"filmwise-error": JSON.stringify(error),
		support: "Please reach out to support@filmwise.ai",
	  }),
	  {
		status: 500,
		headers: {
		  "content-type": "application/json;charset=UTF-8",
		  "helicone-error": "true",
		},
	  }
	);
  }
