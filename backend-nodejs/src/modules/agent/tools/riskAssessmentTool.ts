import { RiskAssessment } from '../../riskappetite/models/RiskAssessment';
import { AssessmentStatus, ScoreCategoryCode } from '../../riskappetite/enums/riskEnums';
import { AgentContext, AgentTool } from './types';
import { logger } from '../../../common/utils/logger';

export class RiskAssessmentTool implements AgentTool {
  public readonly name = 'getRiskProfile';
  public readonly description =
    'Fetches the client assessed risk appetite profile, score category (e.g. CONSERVATIVE, MODERATE, AGGRESSIVE), and compliance assessment status.';

  public readonly parameters = {
    type: 'OBJECT' as const,
    properties: {
      clientId: {
        type: 'STRING',
        description: 'The unique client ID to retrieve risk assessment for',
      },
    },
    required: ['clientId'],
  };

  public async execute(
    args: Record<string, unknown>,
    context: AgentContext
  ): Promise<Record<string, unknown>> {
    const clientId = String(args.clientId || context.clientId);

    try {
      const assessment = await RiskAssessment.findOne({
        client: clientId,
        status: AssessmentStatus.COMPLETED,
      }).sort({ createdAt: -1 });

      if (!assessment) {
        return {
          assessed: false,
          scoreCategory: ScoreCategoryCode.MODERATE,
          totalScore: 40,
          status: 'NOT_FOUND_DEFAULTED',
          message:
            'No completed risk assessment on file for client. Defaulting to MODERATE risk category for regulatory safety.',
        };
      }

      return {
        assessed: true,
        assessmentId: assessment._id.toString(),
        scoreCategory: assessment.scoreCategory,
        totalScore: assessment.totalScore,
        status: assessment.status,
        assessedDate: assessment.updatedAt ? new Date(assessment.updatedAt).toISOString() : new Date().toISOString(),
      };
    } catch (error: unknown) {
      logger.error({ err: error, clientId }, 'Error executing getRiskProfile tool');
      return {
        assessed: false,
        scoreCategory: ScoreCategoryCode.MODERATE,
        error: 'Database lookup failed during risk assessment query.',
      };
    }
  }
}

export const riskAssessmentTool = new RiskAssessmentTool();
