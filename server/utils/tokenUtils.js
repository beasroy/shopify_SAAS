// A stored credential is only usable if it is a non-empty string. OAuth
// redirects that lost their token leave the literal strings "undefined" or
// "null" in the query, and both are truthy once parsed out of the URL.
export const isUsableToken = (token) =>
  typeof token === "string" &&
  token.trim() !== "" &&
  token !== "undefined" &&
  token !== "null";
