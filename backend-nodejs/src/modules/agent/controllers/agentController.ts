import { Request, Response } from 'express';
import { AppError } from '../../../common/utils/AppError';
import { agentExecutor } from '../services/agentExecutor';
import { AgentRunRequestDto } from '../dto/agentDto';

export class AgentController {
  /**
   * Triggers the Autonomous Portfolio Advisory Agent ReAct loop ("Perform with AI").
   */
  public async runAgent(req: Request, res: Response): Promise<Response> {
    const { clientId, portfolioReviewId, flowType, userGoal, agentMode } = req.body;

    if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
      throw new AppError('Client ID is required to run the portfolio agent', 400);
    }

    const requestDto: AgentRunRequestDto = {
      clientId: clientId.trim(),
      portfolioReviewId: portfolioReviewId ? String(portfolioReviewId).trim() : undefined,
      flowType: flowType === 'NEW_PORTFOLIO' ? 'NEW_PORTFOLIO' : 'REPLACE_FUNDS',
      userGoal: userGoal ? String(userGoal).trim() : undefined,
      agentMode: agentMode || 'vanilla',
    };

    const response = await agentExecutor.runAgent(requestDto);
    return res.status(200).json(response);
  }
}

export const agentController = new AgentController();
