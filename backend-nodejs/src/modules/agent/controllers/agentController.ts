import { Request, Response } from 'express';
import { AppError } from '../../../common/utils/AppError';
import { agentStrategyResolver } from '../strategy/agentStrategyResolver';
import { AgentMode } from '../enums/agentEnums';
import { AgentRunRequestDto } from '../dto/agentDto';

export class AgentController {
  /**
   * Triggers the Autonomous Portfolio Advisory Agent ReAct loop ("Perform with AI").
   * Delegates execution to the configured strategy (Framework / LangGraph, Vanilla, or MCP).
   */
  public async runAgent(req: Request, res: Response): Promise<Response> {
    const { clientId, portfolioReviewId, flowType, userGoal, agentMode } = req.body;

    if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
      throw new AppError('Client ID is required to run the portfolio agent', 400);
    }

    let parsedMode: AgentMode = AgentMode.FRAMEWORK;
    if (agentMode === 'vanilla' || agentMode === AgentMode.VANILLA) {
      parsedMode = AgentMode.VANILLA;
    } else if (agentMode === 'mcp' || agentMode === AgentMode.MCP) {
      parsedMode = AgentMode.MCP;
    } else if (agentMode === 'framework' || agentMode === AgentMode.FRAMEWORK) {
      parsedMode = AgentMode.FRAMEWORK;
    }

    const requestDto: AgentRunRequestDto = {
      clientId: clientId.trim(),
      portfolioReviewId: portfolioReviewId ? String(portfolioReviewId).trim() : undefined,
      flowType: flowType === 'NEW_PORTFOLIO' ? 'NEW_PORTFOLIO' : 'REPLACE_FUNDS',
      userGoal: userGoal ? String(userGoal).trim() : undefined,
      agentMode: parsedMode,
    };

    const strategy = agentStrategyResolver.resolve(parsedMode);
    const response = await strategy.execute(requestDto);
    return res.status(200).json(response);
  }
}

export const agentController = new AgentController();
