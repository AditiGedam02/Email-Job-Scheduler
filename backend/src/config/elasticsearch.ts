import { Client } from "@elastic/elasticsearch";

const node = process.env.ELASTICSEARCH_URL;

if (!node) {
  throw new Error("ELASTICSEARCH_URL is not defined");
}

export const elasticsearch = new Client({
  node,
});