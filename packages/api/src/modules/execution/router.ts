import { closePosition } from "./procedures/close-position";
import { executeNextStage } from "./procedures/execute-next-stage";

export const executionRouter = {
  closePosition,
  executeNextStage,
};
