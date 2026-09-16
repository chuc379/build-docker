import { v5 as uuidv5 } from 'uuid';

import { type PrefilledWorkflowCodeStepLogicFunctionDefinition } from 'src/engine/workspace-manager/standard-objects-prefill-data/utils/prefill-workflow-code-step-logic-functions.util';

const WORKFLOW_TEMPLATE_LOGIC_FUNCTION_NAMESPACE =
  '3dac99a2-34f7-4e76-a6d3-4ce4d0cddbbc';

const FILTER_EXPIRING_OPPORTUNITIES_SOURCE = `export const main = async (params) => {
  const opportunities = Array.isArray(params?.opportunities)
    ? params.opportunities
    : [];
  const daysBeforeExpiry = Number(params?.daysBeforeExpiry);

  if (!Number.isInteger(daysBeforeExpiry) || daysBeforeExpiry < 1) {
    return { opportunities: [] };
  }

  const targetDate = new Date();
  targetDate.setUTCHours(0, 0, 0, 0);
  targetDate.setUTCDate(targetDate.getUTCDate() + daysBeforeExpiry);
  const targetDateString = targetDate.toISOString().slice(0, 10);

  return {
    opportunities: opportunities.filter((opportunity) => {
      if (typeof opportunity?.closeDate !== 'string') {
        return false;
      }

      const closeDate = new Date(opportunity.closeDate);

      return (
        !Number.isNaN(closeDate.getTime()) &&
        closeDate.toISOString().slice(0, 10) === targetDateString
      );
    }),
  };
};`;

const CHECK_REPURCHASE_REMINDER_SOURCE = `export const main = async (params) => {
  const opportunities = Array.isArray(params?.opportunities)
    ? params.opportunities
    : [];
  const openOpportunities = Array.isArray(params?.openOpportunities)
    ? params.openOpportunities
    : [];
  const repurchaseDays = Number(params?.repurchaseDays);
  const company = params?.company;
  const opportunity = opportunities
    .filter((item) => typeof item?.closeDate === 'string')
    .sort((left, right) => right.closeDate.localeCompare(left.closeDate))[0];

  if (
    !opportunity ||
    openOpportunities.length > 0 ||
    !Number.isInteger(repurchaseDays) ||
    repurchaseDays < 1
  ) {
    return {
      shouldCreateReminder: false,
      daysSinceLastOrder: 0,
      assigneeId: '',
      reminders: [],
    };
  }

  const closeDate = new Date(opportunity.closeDate);

  if (Number.isNaN(closeDate.getTime())) {
    return {
      shouldCreateReminder: false,
      daysSinceLastOrder: 0,
      assigneeId: '',
      reminders: [],
    };
  }

  closeDate.setUTCHours(0, 0, 0, 0);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const daysSinceLastOrder = Math.floor((today.getTime() - closeDate.getTime()) / 86400000);
  const assigneeId =
    typeof company?.accountOwnerId === 'string' ? company.accountOwnerId : '';
  const companyId = typeof company?.id === 'string' ? company.id : '';
  const companyName = typeof company?.name === 'string' ? company.name : '';
  const shouldCreateReminder =
    daysSinceLastOrder === repurchaseDays && assigneeId !== '' && companyId !== '';

  return {
    shouldCreateReminder,
    daysSinceLastOrder,
    assigneeId,
    reminders: shouldCreateReminder
      ? [{ companyId, companyName, daysSinceLastOrder, assigneeId }]
      : [],
  };
};`;

const FILTER_TODAYS_BIRTHDAYS_SOURCE = `export const main = async (params) => {
  const people = Array.isArray(params?.people) ? params.people : [];
  const today = new Date();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();

  return {
    people: people.filter((person) => {
      const birthday = person?.birthday;
      const primaryEmail = person?.emails?.primaryEmail;

      if (
        typeof birthday !== 'string' ||
        typeof primaryEmail !== 'string' ||
        primaryEmail.trim() === ''
      ) {
        return false;
      }

      const birthdayMatch = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(birthday);

      if (!birthdayMatch) {
        return false;
      }

      const year = Number(birthdayMatch[1]);
      const birthdayMonth = Number(birthdayMatch[2]);
      const birthdayDay = Number(birthdayMatch[3]);
      const daysInMonth = [
        31,
        year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
      ];

      return (
        year > 0 &&
        birthdayMonth >= 1 &&
        birthdayMonth <= 12 &&
        birthdayDay >= 1 &&
        birthdayDay <= daysInMonth[birthdayMonth - 1] &&
        birthdayMonth === month &&
        birthdayDay === day
      );
    }),
  };
};`;

const ADD_ONE_DAY_SOURCE = `export const main = async (params) => {
  const createdAt = typeof params?.createdAt === 'string' ? params.createdAt : '';
  const createdAtDate = new Date(createdAt);

  if (Number.isNaN(createdAtDate.getTime())) {
    return { dueAt: '' };
  }

  createdAtDate.setUTCDate(createdAtDate.getUTCDate() + 1);

  return { dueAt: createdAtDate.toISOString() };
};`;

const AHP_MATCHING_SOURCE = `export const main = async (params) => {
  const p = params?.trigger?.body || params?.trigger || params?.body || params || {};
  const fullName = p.candidate_name || p.fullName || p.name || p.full_name || p.data?.name || '';
  const email = p.candidate_email || p.email || p.mail || p.data?.email || '';
  const phone = p.candidate_phone || p.phone || p.phoneNumber || p.data?.phone || '';
  const pmEmail = p.pm_email || p.pmEmail || p.hr_email || 'tuyendung@tinasoft.vn';
  const displayJob = p.job_title || p.jobTitle || p.position || 'Software Engineer';
  const jd = p.jd_text || p.job_description || p.jd || displayJob;
  let cv = p.cv_text || p.cvText || p.cv_content || '';
  const sourceName = p.source || (p.candidate_name ? 'TOPCV' : 'WEBHOOK');

  if (!cv && p.cv_file) {
    try {
      let fileData = p.cv_file;
      let fileId = '';
      if (typeof fileData === 'object' && fileData !== null) {
        fileId = fileData.id || fileData.fileId || fileData.file_id || '';
      } else if (typeof fileData === 'string') {
        fileId = fileData;
      }
      if (fileId) cv = 'CV File Attached ID: ' + fileId;
    } catch (_) {}
  }

  if (!cv) {
    return {
      mappedFullName: fullName || 'Ứng viên chưa rõ tên',
      mappedEmail: email,
      mappedPhone: phone,
      mappedJobTitle: displayJob,
      mappedCvText: '',
      source: sourceName,
      matchingScore: 0,
      pmEmail,
      skillsScore: 0,
      expScore: 0,
      eduScore: 0,
      generalScore: 0,
      recommendation: 'HỒ SƠ MẪU TOPCV (Chưa đính kèm file CV thực tế)',
      aiEvaluation: 'ℹ️ Đây là lượt gửi kiểm thử Webhook từ TopCV cho ứng viên: ' + (fullName || '') + '. Khi ứng viên nộp CV thật có file đính kèm, hệ thống sẽ tự động tải file từ TopCV và chấm điểm AHP đầy đủ.'
    };
  }

  const displayName = fullName || 'Ứng viên';
  const lowerCV = cv.toLowerCase();
  const lowerJD = jd.toLowerCase();

  const canonicalSkills = [
    { key: 'nodejs', label: 'NodeJS', patterns: ['nodejs', 'node.js', 'node js'] },
    { key: 'nestjs', label: 'NestJS', patterns: ['nestjs', 'nest.js', 'nest js'] },
    { key: 'express', label: 'ExpressJS', patterns: ['expressjs', 'express.js', 'express'] },
    { key: 'typescript', label: 'TypeScript', patterns: ['typescript', 'ts'] },
    { key: 'javascript', label: 'JavaScript', patterns: ['javascript', 'js'] },
    { key: 'react', label: 'ReactJS', patterns: ['reactjs', 'react.js', 'react'] },
    { key: 'nextjs', label: 'NextJS', patterns: ['nextjs', 'next.js'] },
    { key: 'vue', label: 'VueJS', patterns: ['vuejs', 'vue.js', 'vue'] },
    { key: 'python', label: 'Python', patterns: ['python'] },
    { key: 'django', label: 'Django', patterns: ['django'] },
    { key: 'fastapi', label: 'FastAPI', patterns: ['fastapi'] },
    { key: 'java', label: 'Java', patterns: ['java', 'springboot', 'spring boot', 'spring'] },
    { key: 'golang', label: 'Golang', patterns: ['golang', 'go lang'] },
    { key: 'php', label: 'PHP', patterns: ['php', 'laravel'] },
    { key: 'csharp', label: 'C# / .NET', patterns: ['c#', '.net', 'asp.net'] },
    { key: 'postgresql', label: 'PostgreSQL', patterns: ['postgresql', 'postgres'] },
    { key: 'mysql', label: 'MySQL', patterns: ['mysql'] },
    { key: 'mongodb', label: 'MongoDB', patterns: ['mongodb', 'mongo'] },
    { key: 'redis', label: 'Redis', patterns: ['redis'] },
    { key: 'docker', label: 'Docker', patterns: ['docker'] },
    { key: 'kubernetes', label: 'Kubernetes', patterns: ['kubernetes', 'k8s'] },
    { key: 'aws', label: 'AWS', patterns: ['aws', 'amazon web services'] },
    { key: 'cicd', label: 'CI/CD', patterns: ['ci/cd', 'cicd'] },
    { key: 'git', label: 'Git', patterns: ['git', 'github', 'gitlab'] },
    { key: 'restful', label: 'REST API', patterns: ['rest api', 'restful api', 'restful', 'graphql'] },
    { key: 'microservices', label: 'Microservices', patterns: ['microservices', 'microservice', 'bullmq'] },
    { key: 'flutter', label: 'Flutter', patterns: ['flutter', 'dart'] }
  ];

  const requiredSkills = [];
  for (const s of canonicalSkills) {
    if (s.patterns.some(p => lowerJD.includes(p))) {
      requiredSkills.push(s);
    }
  }

  const matchedSkills = [];
  const missingSkills = [];
  for (const s of requiredSkills) {
    if (s.patterns.some(p => lowerCV.includes(p))) {
      matchedSkills.push(s.label);
    } else {
      missingSkills.push(s.label);
    }
  }

  let skillsScore = requiredSkills.length > 0 ? Math.round((matchedSkills.length / requiredSkills.length) * 100) : (matchedSkills.length > 0 ? 60 : 0);

  let requiredYears = 1;
  const jdExpMatch = lowerJD.match(/(\\d+)\\+?\\s*(năm|year|yr|nam)/i);
  if (jdExpMatch && jdExpMatch[1]) {
    requiredYears = parseInt(jdExpMatch[1], 10);
  } else if (lowerJD.includes('senior')) {
    requiredYears = 4;
  } else if (lowerJD.includes('middle') || lowerJD.includes('mid')) {
    requiredYears = 2;
  }

  let actualYears = 0;
  const cvExpMatch = lowerCV.match(/(\\d+(?:\\.\\d+)?)\\+?\\s*(năm|year|yr|nam)/i);
  if (cvExpMatch && cvExpMatch[1]) {
    actualYears = parseFloat(cvExpMatch[1]);
  } else if (lowerCV.includes('senior')) {
    actualYears = 3.5;
  } else if (lowerCV.includes('junior') || lowerCV.includes('fresher')) {
    actualYears = 1;
  }

  let expScore = 0;
  if (actualYears > 0) {
    const expRatio = actualYears / requiredYears;
    expScore = expRatio >= 1 ? Math.min(100, Math.round(80 + (expRatio - 1) * 20)) : Math.round(expRatio * 75);
  }

  let eduScore = 0;
  const eduKeywordsUni = ['đại học', 'university', 'bách khoa', 'quốc gia', 'công nghệ', 'bachelor', 'cử nhân', 'kỹ sư', 'master', 'thạc sĩ'];
  const eduKeywordsCollege = ['cao đẳng', 'college', 'trung cấp'];
  if (eduKeywordsUni.some(k => lowerCV.includes(k))) {
    eduScore = 90;
  } else if (eduKeywordsCollege.some(k => lowerCV.includes(k))) {
    eduScore = 60;
  }

  let generalScore = 0;
  const langKeywordsHigh = ['ielts', 'toefl', 'toeic 7', 'toeic 8', 'toeic 9', 'n1', 'n2', 'tiếng anh thành thạo', 'fluent english'];
  const langKeywordsMid = ['tiếng anh', 'english', 'toeic', 'n3', 'giao tiếp tốt', 'tối ưu', 'tối ưu hóa', 'quản lý'];
  if (langKeywordsHigh.some(k => lowerCV.includes(k))) {
    generalScore = 90;
  } else if (langKeywordsMid.some(k => lowerCV.includes(k))) {
    generalScore = 70;
  }

  const matchingScore = Math.round(
    skillsScore * 0.40 +
    expScore * 0.30 +
    eduScore * 0.15 +
    generalScore * 0.15
  );

  let recommendationTag = 'CHƯA ĐẠT YÊU CẦU';
  if (matchingScore >= 75) {
    recommendationTag = 'RẤT PHÙ HỢP (Ưu tiên phỏng vấn)';
  } else if (matchingScore >= 55) {
    recommendationTag = 'PHÙ HỢP (Khuyến nghị phỏng vấn)';
  } else if (matchingScore >= 35) {
    recommendationTag = 'CÂN NHẮC (Cần đánh giá thêm kỹ năng thiếu)';
  } else {
    recommendationTag = 'KHÔNG PHÙ HỢP (Hồ sơ chưa đạt tiêu chí cốt lõi)';
  }

  const matchedSkillsText = matchedSkills.length > 0 ? matchedSkills.join(', ') : 'Chưa có';
  const missingSkillsText = missingSkills.length > 0 ? missingSkills.join(', ') : 'Không có';

  const aiEvaluation = [
    '📊 KẾT QUẢ ĐÁNH GIÁ ĐỘ PHÙ HỢP THEO MÔ HÌNH AHP (Analytic Hierarchy Process):',
    '--------------------------------------------------',
    '• Điểm tổng hợp (Overall Match): ' + matchingScore + '%',
    '• Nguồn tiếp nhận (Intake Channel): ' + sourceName,
    '',
    '🔍 CHI TIẾT 4 TIÊU CHÍ TRỌNG SỐ:',
    '  1. Kỹ năng chuyên môn (Trọng số 40%): ' + skillsScore + '/100',
    '     - Kỹ năng phát hiện phù hợp: ' + matchedSkillsText,
    '     - Kỹ năng còn thiếu theo JD: ' + missingSkillsText,
    '  2. Kinh nghiệm làm việc (Trọng số 30%): ' + expScore + '/100',
    '     - Yêu cầu JD: ' + requiredYears + ' năm | Hồ sơ ứng viên: ' + actualYears + ' năm',
    '  3. Trình độ học vấn (Trọng số 15%): ' + eduScore + '/100',
    '     - ' + (eduScore > 0 ? 'Có bằng cấp / trường đào tạo phù hợp' : 'Không có thông tin bằng cấp trong CV'),
    '  4. Ngoại ngữ & Kỹ năng bổ trợ (Trọng số 15%): ' + generalScore + '/100',
    '     - ' + (generalScore > 0 ? 'Có chứng chỉ / kỹ năng bổ trợ phù hợp' : 'Không có thông tin ngoại ngữ trong CV'),
    '',
    '📝 KẾT LUẬN & ĐỀ XUẤT:',
    '  • Đề xuất: ' + recommendationTag,
    '  • Nhận xét: Ứng viên ' + displayName + ' đáp ứng ' + matchingScore + '% tiêu chí cho vị trí ' + displayJob + '.'
  ].join('\\n');

  return {
    mappedFullName: fullName || displayName,
    mappedEmail: email,
    mappedPhone: phone,
    mappedJobTitle: displayJob,
    mappedCvText: cv,
    source: sourceName,
    pmEmail,
    skillsScore,
    expScore,
    eduScore,
    generalScore,
    matchingScore,
    recommendation: recommendationTag,
    aiEvaluation
  };
};`;

export const getWorkflowTemplateLogicFunctionIds = (workspaceId: string) => ({
  filterExpiringOpportunities: uuidv5(
    `${workspaceId}:workflow-template:filter-expiring-opportunities:v2`,
    WORKFLOW_TEMPLATE_LOGIC_FUNCTION_NAMESPACE,
  ),
  checkRepurchaseReminder: uuidv5(
    `${workspaceId}:workflow-template:check-repurchase-reminder:v2`,
    WORKFLOW_TEMPLATE_LOGIC_FUNCTION_NAMESPACE,
  ),
  filterTodaysBirthdays: uuidv5(
    `${workspaceId}:workflow-template:filter-todays-birthdays`,
    WORKFLOW_TEMPLATE_LOGIC_FUNCTION_NAMESPACE,
  ),
  addOneDay: uuidv5(
    `${workspaceId}:workflow-template:add-one-day`,
    WORKFLOW_TEMPLATE_LOGIC_FUNCTION_NAMESPACE,
  ),
  ahpMatching: uuidv5(
    `${workspaceId}:cv-intake:ahp-matching`,
    WORKFLOW_TEMPLATE_LOGIC_FUNCTION_NAMESPACE,
  ),
});

export const getWorkflowTemplateLogicFunctionDefinitions = (
  workspaceId: string,
): PrefilledWorkflowCodeStepLogicFunctionDefinition[] => {
  const {
    filterExpiringOpportunities,
    checkRepurchaseReminder,
    filterTodaysBirthdays,
    addOneDay,
    ahpMatching,
  } = getWorkflowTemplateLogicFunctionIds(workspaceId);

  return [
    {
      id: filterExpiringOpportunities,
      name: 'Filter opportunities expiring on target day',
      description:
        'Keeps opportunities whose close date is exactly the configured number of days from today.',
      sourceHandlerCode: FILTER_EXPIRING_OPPORTUNITIES_SOURCE,
    },
    {
      id: checkRepurchaseReminder,
      name: 'Check re-purchase reminder threshold',
      description:
        'Calculates the elapsed days since the last completed opportunity and selects the company owner.',
      sourceHandlerCode: CHECK_REPURCHASE_REMINDER_SOURCE,
    },
    {
      id: filterTodaysBirthdays,
      name: "Find today's VIP birthdays",
      description:
        'Keeps VIP and VVIP people whose birthday is today and who have a primary email address.',
      sourceHandlerCode: FILTER_TODAYS_BIRTHDAYS_SOURCE,
    },
    {
      id: addOneDay,
      name: 'Add one day to a date',
      description: 'Adds one calendar day to an ISO date-time value.',
      sourceHandlerCode: ADD_ONE_DAY_SOURCE,
    },
    {
      id: ahpMatching,
      name: 'Universal Mapper & Chấm AHP Đa Nguồn',
      description:
        'Bóc tách dữ liệu CV từ Webhook và chấm điểm độ phù hợp theo mô hình phân tích thứ bậc AHP.',
      sourceHandlerCode: AHP_MATCHING_SOURCE,
    },
  ];
};
