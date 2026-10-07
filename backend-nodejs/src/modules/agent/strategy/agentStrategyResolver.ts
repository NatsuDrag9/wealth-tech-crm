import { AgentMode } from '../enums/agentEnums';
import { IAgentStrategy } from './agentStrategy';
import { vanillaAgentStrategy } from './impl/vanillaAgentStrategy';
import { langGraphAgentStrategy } from './impl/langGraphAgentStrategy';
import { mcpAgentStrategy } from './impl/mcpAgentStrategy';
import { logger } from '../../../common/utils/logger';

export class AgentStrategyResolver {
  private readonly strategies = new Map<AgentMode, IAgentStrategy>();

  constructor() {
    this.registerStrategy(vanillaAgentStrategy);
    this.registerStrategy(langGraphAgentStrategy);
    this.registerStrategy(mcpAgentStrategy);
  }

  public registerStrategy(strategy: IAgentStrategy): void {
    this.strategies.set(strategy.mode, strategy);
    logger.info({ mode: strategy.mode }, 'Registered Agent execution strategy');
  }

  public resolve(mode?: AgentMode): IAgentStrategy {
    const targetMode = mode || AgentMode.FRAMEWORK;
    const strategy = this.strategies.get(targetMode);

    if (!strategy) {
      logger.warn({ requestedMode: mode, fallbackMode: AgentMode.FRAMEWORK }, 'Requested agent strategy not found, falling back to FRAMEWORK (LangGraph)');
      return this.strategies.get(AgentMode.FRAMEWORK) || vanillaAgentStrategy;
    }

    return strategy;
  }

  public getRegisteredModes(): AgentMode[] {
    return Array.from(this.strategies.keys());
  }
}

export const agentStrategyResolver = new AgentStrategyResolver();
