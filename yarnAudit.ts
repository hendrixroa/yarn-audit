import * as fs from 'fs';
import { RequestAPI, RequiredUriUrl } from 'request';
import * as request from 'request-promise-native';
import { AuditData, Vulnerabilities } from "./types";

export class YarnAudit {
  private client: RequestAPI<
    request.RequestPromise,
    request.RequestPromiseOptions,
    RequiredUriUrl
  >;

  constructor() {
    this.client = request.defaults({
      baseUrl: 'https://slack.com/api/chat.postMessage',
      headers: {
        Authorization: `Bearer ${process.env.YARN_AUDIT_SLACK_TOKEN}`,
      },
      json: true,
    });
  }

  private loadAuditData(pathFile: string): string[] {
    // Cut per lines, yarn audit return each json item separated by \n
    const vulnerabilities = fs.readFileSync(pathFile, 'utf8').split('\n');

    // Remove last empty item
    vulnerabilities.pop();

    return vulnerabilities;
  }

  private filterSummaryData(vulnerabilities: string []): AuditData {
    const summary: string | undefined =
      vulnerabilities.find((item: string) => {
        const itemParsed: any = JSON.parse(item);
        return itemParsed.type === 'auditSummary';
      }) || '{}';

    const summaryData: any = JSON.parse(summary);
    return summaryData as AuditData;
  }

  private calculateVulnerabilities(dataVulnerabilities: Vulnerabilities): number {
    const countVulnerabilities: number = Object.values(
     dataVulnerabilities,
    ).reduce((total: number, current: number) => {
      return total + current;
    });
    return countVulnerabilities;
  }

  private async sendSlackMessage(countVulnerabilities: number, packageName: string): Promise<void> {
    const postData = {
      attachments: [
        {
          author_name: 'YARN - AUDIT',
          color: '#ff0000',
          mrkdwn_in: ['text', 'pretext'],
          text: `Found *${countVulnerabilities}* vulnerabilities in _${packageName}_ project, for more details run _yarn audit_`,
        },
      ],
      channel: `#packages-vulnerabilities`,
      icon_emoji: ':warning:',
      mrkdwn: true,
      username: 'YARN Audit Alert',
    };

    const result = await this.client.post('', {
      body: postData,
    });

    if (!result.ok) {
      throw new Error('The message cannot be delivered');
    }
  }

  public async sendReport(pathFile: string, packageName: string) {

    const vulnerabilities: string[] = this.loadAuditData(pathFile);
    const summaryData: AuditData = this.filterSummaryData(vulnerabilities);
    const countVulnerabilities: number = this.calculateVulnerabilities(summaryData.data.vulnerabilities);

    if (countVulnerabilities > 0) {
      await this.sendSlackMessage(countVulnerabilities, packageName);

      // And probably you won't go to production with vulnerabilities, then process.exit(1);
    }
    // Then everything is fine
    console.log('Vulnerabilities: ', countVulnerabilities);
  }
}

if (!process.argv[2] || !process.argv[3]) {
  console.error(
    'The path file or module is missing, for example: PATH_FILE=yarn_audit.json yarn run audit_report',
  );
  process.exit(1);
}
const report: YarnAudit = new YarnAudit();
report
  .sendReport(process.argv[2], process.argv[3])
  .then()
  .catch((err: any) => console.error(err));
