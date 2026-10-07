import { AgentMode } from '../../enums/agentEnums';
import { AgentRunRequestDto, AgentRunResponseDto } from '../../dto/agentDto';
import { IAgentStrategy } from '../agentStrategy';
import { agentExecutor } from '../../services/agentExecutor';

export class VanillaAgentStrategy implements IAgentStrategy {
  public readonly mode = AgentMode.VANILLA;

  public async execute(request: AgentRunRequestDto): Promise<AgentRunResponseDto> {
    return agentExecutor.runAgent(request);
  }
}

export const vanillaAgentStrategy = new VanillaAgentStrategy();
