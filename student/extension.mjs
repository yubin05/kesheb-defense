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
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
