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
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
