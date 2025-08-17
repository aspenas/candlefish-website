import { Query } from "./Query";
import { Mutation } from "./Mutation";
import { Estimate } from "./Estimate";
import { Subscription } from "./Subscription";

const resolvers = {
  ...Query,
  ...Mutation,
  ...Estimate,
  ...Subscription,
};

export default resolvers;
