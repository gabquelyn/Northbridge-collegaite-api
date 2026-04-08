import { APPLICATION_FEE, prices } from "../config/prices";

export default function cost(
  programs: APPLICATION_PROGRAMS[],
  enrol?: boolean,
) {
  let totalPrice = enrol ? 0 : APPLICATION_FEE;
  for (const program of programs) {
    for (const price of prices) {
      if (program === price.name) {
        totalPrice += price.amount;
      }
    }
  }
  return totalPrice;
}
