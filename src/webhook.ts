import ky from "ky";
import { EitherAsync, Left, Maybe } from "purify-ts";
import { eventTypes } from "./eventTypes";
import { KeepMeMemberData, KeepmeProspectData } from "./schema";
import { convertKeysToSnakeCase, PlainObject } from "./util";

const TYPE = Object.freeze({
  JOINER: "joiner",
  STATUS_UPDATE: "status-update"
});

/**
 * Because KeepMe didn't provide webhook URLs for test environment, so we return Right("WEBHOOK_URL not set"), rather than Left("WEBHOOK_URL not set").
 * Need to convert payload from camel case to snake case.
 */
const sendWebhook = (maybeUrl: Maybe<string>, data: PlainObject): EitherAsync<Error, string> => {
  const payload = convertKeysToSnakeCase(data);
  return maybeUrl
    .filter(url => url.length > 0)
    .map(url => {
      return EitherAsync<Error, string>(async ({ throwE }) => {
        console.log(`Sending webhook to ${url}, payload: ${JSON.stringify(payload)}`);
        const response = await ky.post(url, { json: payload });
        console.log(`Webhook response from ${url}: ${JSON.stringify(response)}`);

        if (!response.ok) {
          return throwE(new Error(`Failed to send webhook: ${response.statusText}`));
        }
        return response.json();
      });
    })
    .orDefault(EitherAsync.liftEither(Left(new Error("Webhook URL is not set"))));
};

const callMemberWebhook = (data: KeepMeMemberData, eventType: string): EitherAsync<Error, string> => {
  const maybeUrl = Maybe.fromNullable(process.env.WEBHOOK_MEMBER_URL);
  const type = eventType === eventTypes.MEMBER_JOINED ? TYPE.JOINER : TYPE.STATUS_UPDATE;

  const payload = {
    type: type,
    description: eventType,
    data: data
  };

  return sendWebhook(maybeUrl, payload);
};

const callProspectWebhook = (data: KeepmeProspectData): EitherAsync<Error, string> => {
  const maybeUrl = Maybe.fromNullable(process.env.WEBHOOK_PROSPECT_URL);
  const payload = data;

  return sendWebhook(maybeUrl, payload);
};

export { callMemberWebhook, callProspectWebhook };
