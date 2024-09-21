import { format } from "date-fns";
import { Maybe } from "purify-ts";

const toDate = (dateTime: string): string => {
  return format(new Date(dateTime), "yyyy-MM-dd");
};

const getEarlierDateTime = (firstDateTimeStr: string | null, secondDateTimeStr: string | null): Maybe<string> => {
  const firstDateTime = Maybe.fromNullable(firstDateTimeStr);
  const secondDateTime = Maybe.fromNullable(secondDateTimeStr);

  return firstDateTime
    .map(first => secondDateTime.map(second => (first < second ? first : second)).orDefault(first))
    .alt(secondDateTime);
};

const todayDate = toDate(new Date().toISOString());

export { toDate, getEarlierDateTime, todayDate };
