export function getSafeDisplayMessage(message, fallback = "Please try again.") {
  return typeof message === "string" &&
    message.length > 0 &&
    message.length <= 180 &&
    !/(\bat\s+\S+\s+\(|https?:\/\/|mongodb(\+srv)?:|stack|exception:)/i.test(message)
    ? message
    : fallback;
}
