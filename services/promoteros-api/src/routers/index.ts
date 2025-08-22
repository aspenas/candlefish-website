import { router } from '../trpc';
import { authRouter } from './auth';
import { organizationRouter } from './organization';
import { venueRouter } from './venue';
import { eventRequestRouter } from './eventRequest';
import { eventRouter } from './event';
import { taskRouter } from './task';
import { userRouter } from './user';

export const appRouter = router({
  auth: authRouter,
  organization: organizationRouter,
  venue: venueRouter,
  eventRequest: eventRequestRouter,
  event: eventRouter,
  task: taskRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
