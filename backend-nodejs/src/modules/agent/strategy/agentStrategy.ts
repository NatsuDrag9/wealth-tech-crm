import { AgentMode } from '../enums/agentEnums';
import { AgentRunRequestDto, AgentRunResponseDto } from '../dto/agentDto';

export interface IAgentStrategy {
  readonly mode: AgentMode;
  execute(request: AgentRunRequestDto): Promise<AgentRunResponseDto>;
}
