import { v4 as uuidv4 } from 'uuid';

import { StepLogicalOperator, ViewFilterOperand } from 'twenty-shared/types';

export const ERROR_HANDLING_OPTIONS = {
  retryOnFailure: { value: false },
  continueOnFailure: { value: false },
};

export const buildRecordUrl = ({
  workspaceUrl,
  objectName,
  recordIdVariable,
}: {
  workspaceUrl: string;
  objectName: 'company' | 'opportunity' | 'person';
  recordIdVariable: string;
}) => `${workspaceUrl}/object/${objectName}/${recordIdVariable}`;

const CAPTURE_VARIABLE_TAG_REGEX = /({{[^{}]+}})/;
const STANDALONE_VARIABLE_REGEX = /^{{[^{}]+}}$/;

export const buildTaskBody = (markdown: string) => {
  const paragraphContent: Array<Record<string, unknown>> = [];
  const lines = markdown.split(/\n/);

  lines.forEach((line, index) => {
    const parts = line.split(CAPTURE_VARIABLE_TAG_REGEX);

    parts.forEach((part) => {
      if (STANDALONE_VARIABLE_REGEX.test(part)) {
        paragraphContent.push({
          type: 'variableTag',
          attrs: { variable: part },
        });
      } else if (part.length > 0) {
        paragraphContent.push({
          type: 'text',
          text: part,
        });
      }
    });

    if (index < lines.length - 1) {
      paragraphContent.push({
        type: 'hardBreak',
      });
    }
  });

  return {
    blocknote: JSON.stringify([
      {
        type: 'paragraph',
        content: paragraphContent,
      },
    ]),
    markdown,
  };
};

const TINA_CRM_LOGO_URL = 'https://tinacrm.com/img/logo-crm.png';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export const buildEmailBody = ({
  badgeText,
  badgeColor,
  badgeBgColor,
  title,
  paragraphs,
  details = [],
  linkText,
  linkUrl,
  footerText = 'Email tự động từ TinaCRM',
}: {
  badgeText?: string;
  badgeColor?: string;
  badgeBgColor?: string;
  title: string;
  paragraphs: string[];
  details?: Array<{ label: string; value: string }>;
  linkText?: string;
  linkUrl?: string;
  footerText?: string;
}) => {
  const accentColor = badgeColor ?? '#2563eb';
  const accentBackgroundColor = badgeBgColor ?? '#eff6ff';
  const badge = badgeText
    ? `<tr><td style="padding:0 0 18px;"><span style="display:inline-block;padding:7px 12px;border-radius:999px;background-color:${accentBackgroundColor};color:${accentColor};font-family:Arial,sans-serif;font-size:12px;font-weight:700;line-height:16px;letter-spacing:0.6px;text-transform:uppercase;">${escapeHtml(badgeText)}</span></td></tr>`
    : '';
  const paragraphRows = paragraphs
    .map(
      (paragraph) =>
        `<tr><td style="padding:0 0 14px;color:#475569;font-family:Arial,sans-serif;font-size:16px;line-height:25px;">${escapeHtml(paragraph)}</td></tr>`,
    )
    .join('');
  const detailRows = details
    .map(
      ({ label, value }, index) =>
        `<tr><td style="padding:12px 16px;${index < details.length - 1 ? 'border-bottom:1px solid #e2e8f0;' : ''}color:#64748b;font-family:Arial,sans-serif;font-size:14px;line-height:20px;vertical-align:top;width:34%;">${escapeHtml(label)}</td><td style="padding:12px 16px;${index < details.length - 1 ? 'border-bottom:1px solid #e2e8f0;' : ''}color:#0f172a;font-family:Arial,sans-serif;font-size:14px;font-weight:600;line-height:20px;vertical-align:top;">${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  const detailsTable =
    details.length > 0
      ? `<tr><td style="padding:6px 0 22px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;overflow:hidden;background-color:#f8fafc;">${detailRows}</table></td></tr>`
      : '';
  const callToAction =
    linkText && linkUrl
      ? `<tr><td style="padding:2px 0 24px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="${accentColor}" style="border-radius:8px;"><a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 20px;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;line-height:20px;text-decoration:none;">${escapeHtml(linkText)}</a></td></tr></table></td></tr>`
      : '';

  return `<!doctype html><html><body style="margin:0;padding:0;background-color:#f1f5f9;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f1f5f9;"><tr><td align="center" style="padding:32px 16px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;border-collapse:separate;overflow:hidden;"><tr><td style="padding:24px 32px;border-bottom:1px solid #e2e8f0;"><img src="${TINA_CRM_LOGO_URL}" width="144" alt="Tina CRM" style="display:block;width:144px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;"></td></tr><tr><td style="padding:32px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${badge}<tr><td style="padding:0 0 18px;color:#0f172a;font-family:Arial,sans-serif;font-size:26px;font-weight:700;line-height:34px;">${escapeHtml(title)}</td></tr>${paragraphRows}${detailsTable}${callToAction}<tr><td style="padding-top:20px;border-top:1px solid #e2e8f0;color:#94a3b8;font-family:Arial,sans-serif;font-size:12px;line-height:18px;">${escapeHtml(footerText)}</td></tr></table></td></tr></table></td></tr></table></body></html>`;
};

export const buildFilterInput = ({
  leftOperand,
  operand,
  value,
  type,
  fieldMetadataId,
}: {
  leftOperand: string;
  operand: ViewFilterOperand;
  value: string;
  type: string;
  fieldMetadataId?: string;
}) => {
  const groupId = uuidv4();

  return {
    stepFilterGroups: [
      { id: groupId, logicalOperator: StepLogicalOperator.AND },
    ],
    stepFilters: [
      {
        id: uuidv4(),
        type,
        value,
        operand,
        stepOutputKey: leftOperand,
        fieldMetadataId,
        stepFilterGroupId: groupId,
        positionInStepFilterGroup: 0,
      },
    ],
  };
};

export const buildRecordFilterGroup = () => ({
  id: uuidv4(),
  logicalOperator: StepLogicalOperator.AND,
});
