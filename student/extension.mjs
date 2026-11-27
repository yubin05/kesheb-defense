// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.

const DEVICE_STATUS = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
const SESSION_STATUS = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
const MODE_NOTICE = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (className) element.className = className;
  return element;
}

// 색상과 함께 글자로도 구분한다: 정상만 그대로, 미충족·만료·철회됨은 "주의:", 목록에 없는 값은 확인 불가.
function statusBadge(labels, value) {
  const known = Object.hasOwn(labels, value);
  const normal = value === 'compliant' || value === 'active';
  const kind = normal ? 'ok' : known && value !== 'unknown' ? 'error' : 'empty';
  const text = known ? `${kind === 'error' ? '주의: ' : ''}${labels[value]} (${value})` : '확인 불가';
  return node('span', text, `tag state-${kind}`);
}

// 매번 입력만으로 새 DOM을 만든다. 이전 값을 저장하지 않으므로 오류 시 옛 사용자 정보가 남지 않는다.
function identitySection(title, resource, renderOk) {
  const box = node('section');
  box.append(node('h3', title));
  const notice = MODE_NOTICE[resource?.mode];
  if (notice) box.append(node('p', `${notice} (${resource.mode})`, 'tag tag-demo'));
  if (resource?.status === 'loading') box.append(node('p', '불러오는 중…', 'state state-loading'));
  else if (resource?.status === 'error') {
    const prefix = resource.mode === 'unknown' ? '확인 불가' : '연결 실패';
    box.append(node('p', `${prefix}: ${resource.error?.message || '서버 메시지 없음'}`, 'state state-error'));
  } else if (resource?.status === 'ok') box.append(renderOk(resource.data));
  else box.append(node('p', '확인 불가: 상태 정보가 없습니다.', 'state state-empty'));
  return box;
}

function labeled(label, id, badge) {
  const wrap = node('span');
  wrap.append(node('span', label ? `${label} (${id}) ` : `${id} `, 'item-title'));
  if (badge) wrap.append(badge);
  return wrap;
}

function itemList(rows, emptyText, describe) {
  if (!Array.isArray(rows) || rows.length === 0) return node('p', emptyText, 'state state-empty');
  const list = node('ul', null, 'plain-list');
  for (const row of rows) {
    const item = node('li');
    item.append(describe(row));
    list.append(item);
  }
  return list;
}

function renderIdentity({ me, devices, sessions } = {}) {
  const root = node('div');
  root.append(
    identitySection('현재 계정', me, ({ user, device, session }) => {
      const dl = node('dl', null, 'identity');
      const row = (term, value) => { dl.append(node('dt', term)); const dd = node('dd'); dd.append(value); dl.append(dd); };
      row('사용자', labeled(user.label, user.id));
      row('기기', labeled(device.label, device.id, statusBadge(DEVICE_STATUS, device.status)));
      row('세션', labeled(null, session.id, statusBadge(SESSION_STATUS, session.status)));
      return dl;
    }),
    identitySection('내 기기 목록', devices, (rows) =>
      itemList(rows, '등록된 기기 없음', (d) => labeled(d.label, d.id, statusBadge(DEVICE_STATUS, d.status)))),
    identitySection('내 로그인 세션 목록', sessions, (rows) =>
      itemList(rows, '로그인 세션 없음', (s) => labeled(null, s.id, statusBadge(SESSION_STATUS, s.status)))),
  );
  return root;
}

export function createStudentView() {
  return {
    renderIdentity,
    renderDecision({ status, mode, data, error, appId } = {}) {
      const root = node('section');
      const selectedApp = appId || data?.appId || '선택한 앱 정보 없음';

      if (status === 'idle') {
        root.append(node('p', '업무 앱을 선택하고 접근을 요청하세요.', 'state state-empty'));
        return root;
      }
      if (status === 'loading') {
        root.append(node('p', `${selectedApp} 판정 확인 중`, 'state state-loading'));
        return root;
      }
      if (status === 'error') {
        const message = typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : '오류 메시지를 확인할 수 없습니다.';
        root.append(
          node('p', `${selectedApp} 요청 실패: ${message}`, 'state state-error'),
          node('p', '요청 실패는 접근 거부 판정이 아닙니다.', 'state state-error'),
        );
        return root;
      }

      const decision = data?.decision;
      const labels = {
        allow: '접근 허용(allow)',
        deny: '접근 거부(deny)',
        challenge: '추가 인증 또는 확인 필요(challenge)',
        unknown: '확인 불가(unknown)',
      };
      const decisionText = Object.hasOwn(labels, decision)
        ? labels[decision]
        : `확인 불가(unknown; 원래 값: ${typeof decision === 'string' ? decision : 'unknown'})`;
      root.append(node('p', `${selectedApp}: ${decisionText}`, 'state state-empty'));
      if (decision === 'challenge') {
        root.append(node('p', '이 앱이 추가 인증이나 확인 절차를 대신 수행하지 않습니다.'));
      }
      root.append(
        node('p', `판정 이유: ${typeof data?.reason === 'string' ? data.reason : '확인 불가'}`),
        node('p', `판정 시각: ${typeof data?.checkedAt === 'string' ? data.checkedAt : '확인 불가'}`),
      );
      return root;
    },
    renderEvents({ status, mode, data, error } = {}) {
      const root = node('section');
      if (status === 'loading') {
        root.append(node('p', '기록을 불러오는 중입니다.', 'state state-loading'));
        return root;
      }
      if (status === 'error') {
        if (error?.code === 'CONTRACT_MISMATCH') {
          root.append(node('p', '확인 불가(CONTRACT_MISMATCH): 기록 데이터 형식을 확인할 수 없습니다.', 'state state-empty'));
        } else {
          const message = typeof error?.message === 'string' && error.message.trim()
            ? error.message
            : '오류 메시지를 확인할 수 없습니다.';
          root.append(node('p', `기록을 불러오지 못했습니다: ${message}`, 'state state-error'));
        }
        return root;
      }
      if (status !== 'ok') {
        root.append(node('p', '확인 불가: 기록 조회 상태를 확인할 수 없습니다.', 'state state-empty'));
        return root;
      }
      if (!Array.isArray(data)) {
        root.append(node('p', '확인 불가: 기록 데이터 형식을 확인할 수 없습니다.', 'state state-empty'));
        return root;
      }

      const events = data.slice().sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      if (events.length === 0) {
        root.append(node('p', '표시할 기록이 없습니다.', 'state state-empty'));
        return root;
      }

      const kindLabels = { access: '접속 기록', xdr: 'XDR 경보' };
      const accessLabels = { allowed: '접근 허용', denied: '접근 거부', unknown: '확인 불가' };
      const sessionLabels = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
      const deviceLabels = { compliant: '준수', noncompliant: '미준수', unknown: '확인 불가' };
      const describeValue = (labels, value) => value === 'unknown'
        ? '확인 불가(unknown)'
        : Object.hasOwn(labels, value) ? `${labels[value]} (${value})` : `확인 불가(unknown; 원래 값: ${String(value ?? 'unknown')})`;
      const describeKind = (value) => Object.hasOwn(kindLabels, value)
        ? `${kindLabels[value]} (${value})`
        : `확인 불가(unknown; 원래 값: ${String(value ?? 'unknown')})`;
      const describeApp = (value) => typeof value === 'string' && value.length
        ? value
        : '앱 ID 확인 불가(appId 없음)';

      root.append(node('h3', '내 최근 보안 기록'));

      const filters = { kind: 'all', appId: 'all', access: 'all' };
      let selectedEventId = null;
      const filterArea = node('div');
      const resultCount = node('p');
      const list = node('ul', null, 'plain-list');
      const detail = node('section');
      detail.id = 'student-event-detail-panel';
      detail.setAttribute('aria-live', 'polite');

      const makeFilter = (key, labelText, id, values, describe) => {
        const label = node('label', labelText);
        label.htmlFor = id;
        const select = node('select');
        select.id = id;
        const all = node('option', '전체');
        all.value = 'all';
        select.append(all);
        for (const value of values) {
          const option = node('option', describe(value));
          option.value = value;
          select.append(option);
        }
        select.addEventListener('change', () => {
          filters[key] = select.value;
          renderRows();
        });
        filterArea.append(label, select);
      };

      const distinct = (read) => [...new Set(events.map(read).filter((value) => typeof value === 'string' && value.length))];
      makeFilter('kind', '기록 종류', 'student-event-kind-filter', distinct((event) => event.kind), describeKind);
      makeFilter('appId', '업무 앱', 'student-event-app-filter', distinct((event) => event.appId), (value) => value);
      makeFilter('access', '접속 상태', 'student-event-access-filter', distinct((event) => event.state?.access), (value) => describeValue(accessLabels, value));

      const detailItems = (title, rows, emptyText) => {
        const section = node('section');
        section.append(node('h4', title));
        if (!Array.isArray(rows) || rows.length === 0) {
          section.append(node('p', emptyText));
          return section;
        }
        const items = node('ul', null, 'plain-list');
        for (const item of rows) {
          const li = node('li');
          li.append(node('p', `ID: ${item.id}`), node('p', `내용: ${item.text}`));
          items.append(li);
        }
        section.append(items);
        return section;
      };

      const renderDetail = (event) => {
        detail.replaceChildren();
        if (!event) {
          detail.removeAttribute('data-student-event-detail');
          return;
        }
        detail.dataset.studentEventDetail = event.id;
        detail.append(
          node('h3', `${event.id} 상세`),
          node('p', `사건 ID: ${event.id}`),
          node('p', `업무 앱: ${describeApp(event.appId)}`),
          detailItems('근거(evidence)', event.evidence, '근거가 없습니다.'),
          detailItems('규칙(rules)', event.rules, '적용 규칙이 없습니다.'),
        );
        const state = node('section');
        state.append(
          node('h4', '상태'),
          node('p', `접속 상태(access): ${describeValue(accessLabels, event.state?.access)}`),
          node('p', `세션 상태(session): ${describeValue(sessionLabels, event.state?.session)}`),
          node('p', `기기 상태(device): ${describeValue(deviceLabels, event.state?.device)}`),
        );
        detail.append(state);
        const actions = Array.isArray(event.supportedActions) ? event.supportedActions : [];
        if (actions.length > 0) {
          const actionSection = node('section');
          actionSection.append(node('h4', '미지원 조치'));
          for (const action of actions) {
            const button = node('button', `${action} 미지원`);
            button.type = 'button';
            button.disabled = true;
            actionSection.append(button);
          }
          actionSection.append(node('p', '조치 실행 연결은 준비 중입니다. 이 안내는 요청을 전송하지 않습니다.'));
          detail.append(actionSection);
        }
      };

      const renderRows = () => {
        const visible = events.filter((event) =>
          (filters.kind === 'all' || event.kind === filters.kind)
          && (filters.appId === 'all' || event.appId === filters.appId)
          && (filters.access === 'all' || event.state?.access === filters.access));
        resultCount.textContent = `현재 표시 건수: ${visible.length}건`;
        list.replaceChildren();

        const selectedVisible = visible.some((event) => event.id === selectedEventId);
        if (!selectedVisible) selectedEventId = null;

        for (const event of visible) {
          const row = node('li');
          row.dataset.studentEventId = event.id;
          row.append(
            node('p', `사건 ID: ${event.id}`),
            node('p', `시각: ${event.at}`),
            node('p', `종류: ${describeKind(event.kind)}`),
            node('p', `업무 앱: ${describeApp(event.appId)}`),
            node('p', `요약: ${event.summary}`),
          );
          const button = node('button', `${event.id} 상세`);
          button.type = 'button';
          button.setAttribute('aria-controls', detail.id);
          button.setAttribute('aria-expanded', event.id === selectedEventId ? 'true' : 'false');
          button.addEventListener('click', () => {
            selectedEventId = event.id;
            for (const row of list.children) {
              const control = row.querySelector('button');
              control?.setAttribute('aria-expanded', row.dataset.studentEventId === selectedEventId ? 'true' : 'false');
            }
            renderDetail(event);
          });
          row.append(button);
          list.append(row);
        }
        renderDetail(events.find((event) => event.id === selectedEventId));
      };

      root.append(filterArea, resultCount, list, detail);
      renderRows();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      const root = node('section');
      root.append(node('h3', '기기·세션·알림·도움정보 상태'));
      if (MODE_NOTICE[mode]) root.append(node('p', `${MODE_NOTICE[mode]} (${mode})`, 'tag tag-demo'));

      const retryText = '다시 시도하려면 화면 위쪽의 “다시 불러오기” 버튼을 직접 누르세요.';
      const messageOf = (resource) => typeof resource?.error?.message === 'string' && resource.error.message.trim()
        ? resource.error.message
        : '오류 메시지를 확인할 수 없습니다.';
      const timeoutOf = (resource) => ['TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT'].includes(resource?.error?.code);
      const resourceSection = (title, resource, emptyText, renderRows) => {
        const section = node('section');
        section.append(node('h4', title));
        if (resource?.status === 'loading') {
          section.append(node('p', `${title}을 불러오는 중입니다.`, 'state state-loading'));
        } else if (resource?.status === 'error') {
          if (['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'].includes(resource.error?.code)) {
            section.append(node('p', `확인 불가 (${resource.error.code}): ${title} 자료 형식을 확인할 수 없습니다.`, 'state state-empty'));
          } else {
            const timeout = timeoutOf(resource) ? ' (시간 초과)' : '';
            section.append(node('p', `${title}을 불러오지 못했습니다${timeout}: ${messageOf(resource)}`, 'state state-error'));
          }
          section.append(node('p', retryText));
        } else if (resource?.status === 'ok') {
          if (!Array.isArray(resource.data)) {
            section.append(node('p', `확인 불가: ${title} 자료 형식을 확인할 수 없습니다.`, 'state state-empty'));
          } else if (resource.data.length === 0) {
            section.append(node('p', emptyText, 'state state-empty'));
          } else {
            section.append(renderRows(resource.data));
          }
        } else {
          section.append(node('p', `${title} 조회 대기`, 'state state-empty'));
        }
        return section;
      };

      root.append(
        resourceSection('기기 목록', devices, '등록된 기기가 없습니다.', (rows) =>
          itemList(rows, '등록된 기기가 없습니다.', (device) =>
            labeled(device.label, device.id, statusBadge(DEVICE_STATUS, device.status)))),
        resourceSection('세션 목록', sessions, '현재 연결된 세션이 없습니다.', (rows) =>
          itemList(rows, '현재 연결된 세션이 없습니다.', (session) =>
            labeled(null, session.id, statusBadge(SESSION_STATUS, session.status)))),
      );
      root.lastChild?.append(node('p', '세션은 현재 검증된 연결 한 개만 표시합니다. 지난 세션 목록이 아닙니다.'));

      const alertSection = node('section');
      alertSection.append(node('h4', '알림'));
      if (!Array.isArray(notifications)) {
        alertSection.append(node('p', '확인 불가: 알림 데이터를 확인할 수 없습니다.', 'state state-empty'));
      } else if (notifications.length === 0) {
        alertSection.append(node('p', '주의할 알림이 없습니다.', 'state state-empty'));
      } else {
        const list = node('ul', null, 'plain-list');
        for (const notification of notifications) {
          const item = node('li');
          item.append(
            node('p', `자료(resource): ${String(notification?.resource ?? '확인 불가')}`),
            node('p', `코드(code): ${String(notification?.code ?? '확인 불가')}`),
            node('p', `메시지(message): ${String(notification?.message ?? '확인 불가')}`),
          );
          list.append(item);
        }
        alertSection.append(list);
      }
      root.append(alertSection);

      const helpSection = node('section');
      helpSection.append(node('h4', '도움정보'));
      let safeDiagnostics = null;
      if (diagnostics?.status === 'loading') {
        helpSection.append(node('p', '도움정보를 불러오는 중입니다.', 'state state-loading'));
      } else if (diagnostics?.status === 'error') {
        const mismatch = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'].includes(diagnostics.error?.code);
        const message = mismatch
          ? `확인 불가 (${diagnostics.error.code}): 진단 정보 형식을 확인할 수 없습니다.`
          : `도움정보를 불러오지 못했습니다: ${messageOf(diagnostics)}`;
        helpSection.append(node('p', message, 'state state-error'));
        helpSection.append(node('p', '다시 보려면 제공 화면의 “도움정보 불러오기” 버튼을 직접 누르세요.'));
      } else if (diagnostics?.status === 'ok' && diagnostics.data && typeof diagnostics.data === 'object' && !Array.isArray(diagnostics.data)) {
        const field = (value) => typeof value === 'string' && value.length <= 500 ? value : '확인 불가';
        safeDiagnostics = {
          requestId: field(diagnostics.data.requestId),
          component: field(diagnostics.data.component),
          version: field(diagnostics.data.version),
          checkedAt: field(diagnostics.data.checkedAt),
          engine: {
            mode: field(diagnostics.data.engine?.mode),
            code: field(diagnostics.data.engine?.code),
          },
        };
        helpSection.append(
          node('p', '도움 요청에 사용할 비밀 없는 연결 점검 정보입니다.'),
          node('p', `requestId: ${safeDiagnostics.requestId}`),
          node('p', `component: ${safeDiagnostics.component}`),
          node('p', `version: ${safeDiagnostics.version}`),
          node('p', `checkedAt: ${safeDiagnostics.checkedAt}`),
          node('p', `engine.mode: ${safeDiagnostics.engine.mode}`),
          node('p', `engine.code: ${safeDiagnostics.engine.code}`),
          node('p', '복사 항목은 위 여섯 필드뿐이며 API 키와 인증 토큰은 포함하지 않습니다. 복사한 뒤 붙여 넣기 전에 내용을 확인하세요.'),
        );
      } else if (diagnostics?.status === 'ok') {
        helpSection.append(node('p', '확인 불가: 진단 정보 형식을 확인할 수 없습니다.', 'state state-empty'));
      } else {
        helpSection.append(node('p', '도움정보를 아직 불러오지 않았습니다.', 'state state-empty'));
      }

      const copyButton = node('button', '도움정보 복사');
      copyButton.type = 'button';
      copyButton.disabled = !safeDiagnostics;
      const copyStatus = node('p');
      copyStatus.setAttribute('aria-live', 'polite');
      copyButton.addEventListener('click', async () => {
        if (!safeDiagnostics) return;
        try {
          const clipboard = globalThis.navigator?.clipboard;
          if (!clipboard || typeof clipboard.writeText !== 'function') throw new Error('CLIPBOARD_UNAVAILABLE');
          await clipboard.writeText(JSON.stringify(safeDiagnostics, null, 2));
          copyStatus.textContent = '도움정보를 클립보드에 복사했습니다.';
        } catch {
          copyStatus.textContent = '도움정보 복사에 실패했습니다. 브라우저의 클립보드 권한을 확인하세요.';
        }
      });
      helpSection.append(copyButton, copyStatus);
      root.append(helpSection);
      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection({ status, mode, data, error, checkedAt, explanationAccepted } = {}) {
      const root = node('section');
      if (MODE_NOTICE[mode]) root.append(node('p', `${MODE_NOTICE[mode]} (${mode})`, 'tag tag-demo'));

      if (status === 'idle') {
        root.append(
          node('p', 'AI 연결 점검 전입니다.', 'state state-empty'),
          node('p', '점검을 시작하려면 “현재 API 연결 점검”을 직접 누르세요. 자동 점검은 하지 않습니다.'),
        );
        return root;
      }
      if (status === 'loading') {
        root.append(node('p', 'AI 연결을 점검하는 중입니다.', 'state state-loading'));
        return root;
      }
      if (status === 'error') {
        const causes = {
          ON_AI_PROVISIONING_PENDING: ['권한 준비 중', '운영 담당자에게 계정 연결과 앱 권한 준비 상태를 확인해 주세요.'],
          WB_CLCO_AUTH_REQUIRED: ['인증 실패', '계정 연결을 다시 확인하고 담당자에게 확인을 요청하세요.'],
          ON_AI_AUTHORIZATION_CHANGED: ['앱 권한 변경', '계정 연결과 앱 권한을 담당자에게 확인해 주세요.'],
          WB_CLCO_ACCESS_BLOCKED: ['접근 제한', '수업용 AI 앱 권한을 담당자에게 확인해 주세요.'],
          SUBJECT_SCOPE_UNVERIFIED: ['계정 권한 확인 불가', '계정 연결과 앱 권한을 담당자에게 확인해 주세요.'],
          WB_CLCO_COHORT_BUDGET_EXHAUSTED: ['반 사용량 한도', '담당자에게 반 사용량과 이용 한도를 확인해 주세요.'],
          WB_CLCO_LIMIT_REACHED: ['이용 한도', '담당자에게 이용 한도를 확인해 주세요.'],
          WB_CLCO_SESSION_CLOSED: ['이용 시간 외', '수업용 AI 이용 시간을 확인해 주세요.'],
          WB_CLCO_RATE_LIMITED: ['요청 제한', '잠시 뒤 “현재 API 연결 점검”을 직접 다시 누르세요.'],
          WB_CLCO_TIMEOUT: ['시간 초과', '잠시 뒤 “현재 API 연결 점검”을 직접 다시 누르세요.'],
          REQUEST_TIMEOUT: ['시간 초과', '잠시 뒤 “현재 API 연결 점검”을 직접 다시 누르세요.'],
          ENGINE_TIMEOUT: ['응답 시간 초과', '잠시 뒤 “현재 API 연결 점검”을 직접 다시 누르세요.'],
          TIMEOUT: ['시간 초과', '잠시 뒤 “현재 API 연결 점검”을 직접 다시 누르세요.'],
          WB_CLCO_CANCELLED: ['취소됨', '이전 점검 결과는 현재 결과가 아닙니다. 필요하면 직접 다시 점검하세요.'],
          CANCELLED: ['취소됨', '이전 점검 결과는 현재 결과가 아닙니다. 필요하면 직접 다시 점검하세요.'],
          REQUEST_CANCELLED: ['취소됨', '이전 점검 결과는 현재 결과가 아닙니다. 필요하면 직접 다시 점검하세요.'],
          MODEL_NOT_CONFIGURED: ['사용 가능한 모델 없음', '담당자에게 모델 허용 설정을 확인해 주세요.'],
          ON_AI_MODEL_LIST_EMPTY: ['사용 가능한 모델 없음', '담당자에게 모델 허용 설정을 확인해 주세요.'],
          AI_REQUEST_UNVERIFIED: ['연결 또는 결과 확인 불가', '잠시 뒤 직접 다시 점검하거나 담당자에게 연결 상태를 확인해 주세요.'],
          ON_AI_INVALID_INPUT: ['요청 입력 확인 불가', '연결 상태와 보안 기록 입력을 확인해 주세요.'],
          ON_AI_INVALID_OUTPUT: ['AI 응답 확인 불가', '담당자에게 수업용 AI 응답 상태를 확인해 주세요.'],
        };
        const known = typeof error?.code === 'string' && Object.hasOwn(causes, error.code);
        const code = known ? error.code : 'AI_REQUEST_UNVERIFIED';
        const [cause, nextStep] = causes[code];
        const message = known && typeof error?.message === 'string' && error.message.trim() && error.message.length <= 1000
          ? error.message
          : 'AI 연결 또는 응답 결과를 확인할 수 없습니다. 담당자에게 확인해 주세요.';
        root.append(
          node('p', `AI 연결 점검 실패 (${code}): ${cause}`, 'state state-error'),
          node('p', `안전한 오류 메시지: ${message}`),
          node('p', nextStep),
          node('p', '이 점검은 자동으로 다시 실행되지 않습니다.'),
        );
        return root;
      }
      if (status !== 'ok') {
        root.append(node('p', 'AI 연결 점검 상태를 확인할 수 없습니다.', 'state state-empty'));
        return root;
      }

      const authorization = data?.audienceAuthorization === 'test'
        ? '시험 연결 점검(test)'
        : data?.audienceAuthorization === 'verified'
          ? '앱 권한 확인 후 점검(verified)'
          : `권한 확인 불가(${typeof data?.audienceAuthorization === 'string' ? data.audienceAuthorization : 'unknown'})`;
      const modelCount = Number.isSafeInteger(data?.modelCount) && data.modelCount >= 0
        ? String(data.modelCount)
        : '확인 불가';
      root.append(
        node('p', `AI 연결 점검 결과: ${authorization}`, 'state state-ok'),
        node('p', `전송 연결 확인(transportChecked): ${data?.transportChecked === true ? '완료(true)' : '확인 불가'}`),
        node('p', `응답 가능한 모델 수: ${modelCount}`),
        node('p', `점검 시각: ${typeof checkedAt === 'string' ? checkedAt : '확인 불가'}`),
        node('p', '이 결과는 연결·모델 목록 점검입니다. 보안 이벤트 설명은 아직 실행되지 않았습니다.'),
      );
      return root;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      const root = node('section');
      const status = explanation?.status;
      if (status === 'error') {
        const rawCode = explanation.error?.code;
        const code = typeof rawCode === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(rawCode) ? rawCode : null;
        const message = typeof explanation.error?.message === 'string' && explanation.error.message.trim() && explanation.error.message.length <= 1000
          ? explanation.error.message
          : 'AI 설명 오류 메시지를 확인할 수 없습니다.';
        root.append(
          node('p', `AI 설명 실패${code ? ` (${code})` : ''}: ${message}`, 'state state-error'),
          node('p', '보안 기록은 그대로입니다. 설명 실패는 보안 기록의 실패나 삭제를 뜻하지 않습니다.'),
        );
        return root;
      }
      if (!event) {
        root.append(node('p', '보안 기록에서 기록을 먼저 선택하세요.', 'state state-empty'));
        return root;
      }
      if (status === 'loading') {
        root.append(node('p', '보안 이벤트 설명을 요청하는 중입니다.', 'state state-loading'));
        return root;
      }
      if (status === 'idle') {
        root.append(node('p', '보안 이벤트 설명 요청 전입니다.', 'state state-empty'));
        return root;
      }
      if (status !== 'ok') {
        root.append(node('p', '보안 이벤트 설명 결과를 확인할 수 없습니다.', 'state state-empty'));
        return root;
      }

      const data = explanation.data;
      const safeCode = typeof explanation.error?.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(explanation.error.code)
        ? explanation.error.code
        : null;
      const unusable = (reason) => {
        root.append(
          node('p', `AI 설명을 사용할 수 없습니다: ${reason}${safeCode ? ` (${safeCode})` : ''}`, 'state state-error'),
          node('p', '근거가 일치하지 않거나 응답을 검증할 수 없어 설명 내용을 표시하지 않습니다.'),
        );
        return root;
      };

      if (typeof event.id !== 'string' || !event.id || typeof data?.summary !== 'string') {
        return unusable('사건 또는 요약 데이터 확인 불가');
      }
      if (data.executed === true) return unusable('AI 응답에 조치가 이미 실행된 것으로 표시됨');
      if (data.executed !== false || data.requiresHumanConfirmation !== true) {
        return unusable('사람 확인 및 미실행 상태를 검증할 수 없음');
      }

      const evidence = Array.isArray(event.evidence) ? event.evidence : [];
      const evidenceById = new Map(evidence
        .filter((item) => typeof item?.id === 'string' && typeof item?.text === 'string')
        .map((item) => [item.id, item.text]));
      const evidenceIds = data.evidenceIds;
      const uniqueEvidenceIds = Array.isArray(evidenceIds) && new Set(evidenceIds).size === evidenceIds.length;
      if (!Array.isArray(evidenceIds) || evidenceIds.length === 0 || !uniqueEvidenceIds
        || evidenceIds.length !== evidenceById.size || evidenceIds.some((id) => !evidenceById.has(id))) {
        return unusable('인용 근거 ID가 현재 보안 기록의 근거와 일치하지 않음');
      }

      const rules = Array.isArray(event.rules) ? event.rules : [];
      if (rules.some((rule) => typeof rule?.id !== 'string' || typeof rule?.text !== 'string')) {
        return unusable('현재 보안 기록의 규칙 데이터를 확인할 수 없음');
      }

      const proposals = data.proposals;
      const supportedActions = Array.isArray(event.supportedActions) ? event.supportedActions : [];
      if (!Array.isArray(proposals) || proposals.some((proposal) =>
        typeof proposal?.action !== 'string'
        || !supportedActions.includes(proposal.action)
        || typeof proposal?.reason !== 'string'
        || !Array.isArray(proposal?.evidenceIds)
        || proposal.evidenceIds.length === 0
        || new Set(proposal.evidenceIds).size !== proposal.evidenceIds.length
        || proposal.evidenceIds.some((id) => !evidenceById.has(id)))) {
        return unusable('제안의 조치 또는 근거를 검증할 수 없음');
      }

      root.dataset.studentExplanationEvent = event.id;
      root.append(
        node('h4', 'AI 설명(참고용)'),
        node('p', `사건 ID: ${event.id}`),
        node('p', data.summary),
      );

      const citedEvidence = node('section');
      citedEvidence.append(node('h5', '인용 근거'));
      const evidenceList = node('ul', null, 'plain-list');
      for (const id of evidenceIds) evidenceList.append(node('li', `${id} — ${evidenceById.get(id)}`));
      citedEvidence.append(evidenceList);
      root.append(citedEvidence);

      const ruleSection = node('section');
      ruleSection.append(node('h5', '적용 규칙'));
      if (rules.length === 0) {
        ruleSection.append(node('p', '규칙이 없습니다.'));
      } else {
        const ruleList = node('ul', null, 'plain-list');
        for (const rule of rules) ruleList.append(node('li', `${rule.id} — ${rule.text}`));
        ruleSection.append(ruleList);
      }
      root.append(ruleSection);

      const stateLabels = {
        access: { title: '접속', values: { allowed: '허용', denied: '거부', unknown: '확인 불가' } },
        session: { title: '세션', values: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' } },
        device: { title: '기기', values: { compliant: '기준 충족', noncompliant: '기준 미충족', unknown: '확인 불가' } },
      };
      const currentState = node('section');
      currentState.append(node('h5', '연동 시스템의 현재 상태'));
      const unknownStates = [];
      for (const [key, info] of Object.entries(stateLabels)) {
        const value = event.state?.[key];
        const label = Object.hasOwn(info.values, value)
          ? `${info.values[value]}(${value})`
          : `확인 불가(원래 값: ${typeof value === 'string' ? value : 'unknown'})`;
        currentState.append(node('p', `${info.title}(${key}): ${label}`));
        if (value === 'unknown' || !Object.hasOwn(info.values, value)) unknownStates.push(info.title);
      }
      currentState.append(node('h5', '확인할 수 없는 상태'));
      currentState.append(node('p', unknownStates.length ? unknownStates.join(', ') : '없음'));
      root.append(currentState);

      const proposalSection = node('section');
      proposalSection.append(node('h5', 'AI 제안'));
      if (proposals.length === 0) {
        proposalSection.append(node('p', supportedActions.length === 0
          ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
          : 'AI가 이 기록에 맞는 조치를 제안하지 않았습니다.'));
      } else {
        const proposalList = node('ul', null, 'plain-list');
        for (const proposal of proposals) {
          const item = node('li');
          item.append(
            node('p', `조치: ${proposal.action}`),
            node('p', `이유: ${proposal.reason}`),
            node('p', `근거 ID: ${proposal.evidenceIds.join(', ')}`),
            node('p', '사람 확인이 필요하며 아직 실행되지 않았습니다.'),
          );
          proposalList.append(item);
        }
        proposalSection.append(proposalList);
      }
      root.append(proposalSection);
      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
