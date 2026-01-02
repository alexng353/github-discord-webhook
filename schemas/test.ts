import d from "../example webhooks/closed.json";
import { githubWebhookSchema } from "./github";

const result = githubWebhookSchema.safeParse(d);

console.log(result);
