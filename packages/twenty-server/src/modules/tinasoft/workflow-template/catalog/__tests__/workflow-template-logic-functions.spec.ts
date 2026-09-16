import { getWorkflowTemplateLogicFunctionDefinitions } from 'src/modules/tinasoft/workflow-template/catalog/workflow-template-logic-functions.constant';

type LogicFunction = (params: unknown) => Promise<unknown>;

const getLogicFunction = (sourceHandlerCode: string): LogicFunction =>
  new Function(
    `${sourceHandlerCode.replace('export const main =', 'const main =')}\nreturn main;`,
  )() as LogicFunction;

const getLogicFunctionByName = (name: string) => {
  const definition = getWorkflowTemplateLogicFunctionDefinitions(
    'workspace-id',
  ).find((logicFunctionDefinition) => logicFunctionDefinition.name === name);

  return getLogicFunction(definition?.sourceHandlerCode ?? '');
};

describe('workflow template logic functions', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('filters birthdays with a strict calendar-date validation', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2028-02-29T01:00:00.000Z'));
    const main = getLogicFunctionByName("Find today's VIP birthdays");

    const result = await main({
      people: [
        {
          id: 'valid-leap-day',
          birthday: '2000-02-29',
          emails: { primaryEmail: 'valid@example.com' },
        },
        {
          id: 'invalid-non-leap-day',
          birthday: '2001-02-29',
          emails: { primaryEmail: 'invalid@example.com' },
        },
        {
          id: 'invalid-date-format',
          birthday: '2000-2-29',
          emails: { primaryEmail: 'format@example.com' },
        },
        {
          id: 'invalid-calendar-date',
          birthday: '2000-02-30',
          emails: { primaryEmail: 'calendar@example.com' },
        },
        {
          id: 'empty-email',
          birthday: '2000-02-29',
          emails: { primaryEmail: '   ' },
        },
      ],
    });

    expect(result).toEqual({
      people: [
        {
          id: 'valid-leap-day',
          birthday: '2000-02-29',
          emails: { primaryEmail: 'valid@example.com' },
        },
      ],
    });
  });

  it('matches expiry dates from DATE_TIME records by their UTC calendar day', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-10T01:00:00.000Z'));
    const main = getLogicFunctionByName(
      'Filter opportunities expiring on target day',
    );
    const matchingOpportunity = {
      id: 'matching-opportunity',
      closeDate: '2026-08-12T18:30:00.000Z',
    };

    const result = await main({
      daysBeforeExpiry: 2,
      opportunities: [
        matchingOpportunity,
        { id: 'other-day', closeDate: '2026-08-13T00:00:00.000Z' },
        { id: 'invalid-date', closeDate: 'not-a-date' },
      ],
    });

    expect(result).toEqual({ opportunities: [matchingOpportunity] });
  });

  it('creates one reminder only for an eligible company without open opportunities', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-10T01:00:00.000Z'));
    const main = getLogicFunctionByName('Check re-purchase reminder threshold');
    const company = {
      id: 'company-id',
      name: 'Acme',
      accountOwnerId: 'owner-id',
    };

    const eligibleResult = await main({
      company,
      repurchaseDays: 30,
      openOpportunities: [],
      opportunities: [
        { id: 'completed-opportunity', closeDate: '2026-07-11T16:00:00.000Z' },
      ],
    });
    const openOpportunityResult = await main({
      company,
      repurchaseDays: 30,
      openOpportunities: [{ id: 'open-opportunity' }],
      opportunities: [
        { id: 'completed-opportunity', closeDate: '2026-07-11T16:00:00.000Z' },
      ],
    });

    expect(eligibleResult).toEqual({
      shouldCreateReminder: true,
      daysSinceLastOrder: 30,
      assigneeId: 'owner-id',
      reminders: [
        {
          companyId: 'company-id',
          companyName: 'Acme',
          daysSinceLastOrder: 30,
          assigneeId: 'owner-id',
        },
      ],
    });
    it('builds an ISO interview slot from a DATE and hour/minute fields', async () => {
    const main = getLogicFunctionByName(
      'Build interview ISO datetime slot from date and hour/minute fields',
    );

    const result = await main({
      interviewDate: '2026-09-20',
      startHour: 10,
      startMinute: 30,
      endHour: 11,
      endMinute: 15,
    });

    expect(result).toEqual({
      interviewDate: '2026-09-20',
      startHour: '10',
      startMinute: '30',
      endHour: '11',
      endMinute: '15',
      startTime: '10:30',
      endTime: '11:15',
      timeZone: 'Asia/Ho_Chi_Minh',
      startsAt: '2026-09-20T10:30:00+07:00',
      endsAt: '2026-09-20T11:15:00+07:00',
    });
  });

  it('rejects an interview slot whose end time is not after the start time', async () => {
    const main = getLogicFunctionByName(
      'Build interview ISO datetime slot from date and hour/minute fields',
    );

    await expect(
      main({
        interviewDate: '2026-09-20',
        startHour: 10,
        startMinute: 0,
        endHour: 10,
        endMinute: 0,
      }),
    ).rejects.toThrow('Thời gian kết thúc phải sau thời gian bắt đầu');
  });

  it('rejects an invalid calendar date for the interview', async () => {
    const main = getLogicFunctionByName(
      'Build interview ISO datetime slot from date and hour/minute fields',
    );

    await expect(
      main({
        interviewDate: '2026-02-30',
        startHour: 10,
        startMinute: 0,
        endHour: 11,
        endMinute: 0,
      }),
    ).rejects.toThrow('Ngày phỏng vấn không tồn tại');
  });

  it('rejects an interview slot that wraps around midnight', async () => {
    const main = getLogicFunctionByName(
      'Build interview ISO datetime slot from date and hour/minute fields',
    );

    await expect(
      main({
        interviewDate: '2026-09-20',
        startHour: 23,
        startMinute: 30,
        endHour: 0,
        endMinute: 15,
      }),
    ).rejects.toThrow('Thời gian kết thúc phải sau thời gian bắt đầu');
  });
});
