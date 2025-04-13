const topics = [
  {id: 'web', label: 'Web'},
  {id: 'javascript', label: 'JavaScript'},
  {id: 'typescript', label: 'TypeScript'},
  {id: 'react-js', label: 'React.js'},
];

const subtopics = [
  {id: 'web-browser-work', topicId: 'web', label: 'browser work', fileName: 'browser-work.html'},

  {id: 'javascript-data-types', topicId: 'javascript', label: 'data types', fileName: 'data-types.html'},
  {id: 'javascript-proto', topicId: 'javascript', label: 'prototype vs proto', fileName: 'prototype-proto.html'},
  {id: 'javascript-this', topicId: 'javascript', label: 'this', fileName: 'this.html'},
  {id: 'javascript-closures', topicId: 'javascript', label: 'closures', fileName: 'closures.html'},
  {id: 'javascript-hoisting', topicId: 'javascript', label: 'hoisting', fileName: 'hoisting.html'},
  {id: 'javascript-event-phases', topicId: 'javascript', label: 'event phases', fileName: 'event-phases.html'},
  {id: 'javascript-currying', topicId: 'javascript', label: 'currying', fileName: 'currying.html'},
  {id: 'javascript-recusion', topicId: 'javascript', label: 'recursion', fileName: 'recursion.html'},
  {id: 'javascript-promises', topicId: 'javascript', label: 'data types', fileName: 'data-types.html'},
  {id: 'javascript-generators', topicId: 'javascript', label: 'generators', fileName: 'generators.html'},
  {id: 'javascript-event-loop', topicId: 'javascript', label: 'event loop', fileName: 'event-loop.html'},
  {id: 'javascript-garbage-collector', topicId: 'javascript', label: 'garbage collector', fileName: 'garbage-collector.html'},

  {id: 'react-js-life-cycle', topicId: 'react-js', label: 'life cycle', fileName: 'life-cycle-react-js.html'},
  {id: 'react-js-hooks', topicId: 'react-js', label: 'hooks', fileName: 'hooks-react-js.html'},
  {id: 'react-js-key-prop', topicId: 'react-js', label: 'key prop', fileName: 'data-types.html'},
  {id: 'react-js-hooks', topicId: 'react-js', label: 'hooks', fileName: 'data-types.html'},
  {id: 'react-js-patterns', topicId: 'react-js', label: 'patterns', fileName: 'patterns.html'},

  {id: 'typescript-common-types', topicId: 'typescript', label: 'common types', fileName: 'common-types.html'},
  {id: 'typescript-type-interface', topicId: 'typescript', label: 'type vs interface', fileName: 'type-interface.html'},
  {id: 'typescript-generics', topicId: 'typescript', label: 'generics', fileName: 'generics.html'},
  {id: 'typescript-utility-types', topicId: 'typescript', label: 'utility types', fileName: 'utility-types.html'},
  {id: 'typescript-type-guard', topicId: 'typescript', label: 'type guards', fileName: 'type-guards.html'},
  {id: 'typescript-maped-type', topicId: 'typescript', label: 'maped types', fileName: 'maped-types.html'},
];

function createSubtopicsListElem(topicId) {
  const subtopicsListElem = document.createElement('ul');
  subtopicsListElem.classList.add('subtopics');
  subtopics.forEach(item => {
    if (topicId !== item.topicId) return;
    const itemElem = document.createElement('li')
    const itemLinkElem = document.createElement('a')
    const topicDir = item.topicId;
    const name = item.fileName;
    const filePath = window.location.pathname.split('/').filter(Boolean).includes('topics')
    ? `../${topicDir}/${name}`
    : `../doc/topics/${topicDir}/${name}`;
    itemLinkElem.href = filePath;

    itemLinkElem.append(item.label);
    itemElem.appendChild(itemLinkElem)
    subtopicsListElem.appendChild(itemElem);
  });
  return subtopicsListElem;
};

async function onClickTopic(event) {
  const { target } = event;
  const isTopic = target.getAttribute('data-type') === 'topic';
  const isSubtopic = target.getAttribute('data-type') === 'subtopic';
  if (isSubtopic) {
    const dir = target.getAttribute('data-topic');
    const name = target.getAttribute('data-filename');
    const filePath = `topics/${dir}/${name}`;
    document.getElementsByTagName('iframe')[0]?.setAttribute('src', `${filePath}`);
  }
}

function initNav() {
  const topicsListElem = document.createElement('ul');
  topicsListElem.classList.add('topics');
  topicsListElem.addEventListener('click', onClickTopic)
  topics.forEach(({ id, label }) => {
    const itemElem = document.createElement('li')
    itemElem.classList.add('topic');
    const labelElem = document.createElement('div');
    labelElem.append(label);
    labelElem.setAttribute('data-type', 'topic');
    itemElem.append(labelElem);
    const subtopicsListElem = createSubtopicsListElem(id);
    if (subtopicsListElem) itemElem.appendChild(subtopicsListElem);
    topicsListElem.appendChild(itemElem);
  });

  const navElem = document.createElement('nav');
  navElem.appendChild(topicsListElem);
  document.body.prepend(navElem)
};

initNav();

