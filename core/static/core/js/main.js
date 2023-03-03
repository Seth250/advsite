const loader = document.getElementById('loader');

const docForm = document.querySelector('.collection__form');

const tablePaginatorForm = document.querySelector('.table-paginator-form');

const docTableHead = document.getElementById('document-table-head');

const docTableBody = document.getElementById('document-table-body');

const docContainer = document.querySelector('.document-container');

const tallyBtnList = document.querySelectorAll('.tally__btn');

const tallyForm = document.querySelector('.tally__form');

const defaultHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json; charset=UTF-8",
  "X-Requested-With": "XMLHttpRequest",
};


function formatDateTime(dateTimeString) {
  /*
    function to ensure datetime format from ajax request corresponds with the format in the
    backend template
  */

  // .slice here removes the 'Z' part from the datetime string (to avoid converting to client time)
  const date = new Date(dateTimeString.slice(0, -1));

  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  const formatter = new Intl.DateTimeFormat('en-US', options);
  const formattedDate = formatter.format(date);

  const hours = date.getHours();
  const minutes = date.getMinutes();

  let hoursMinutes = `${hours % 12 || 12}`;
  if (date.getMinutes() > 0) {
    hoursMinutes += `:${minutes.toLocaleString('en-US', { minimumIntegerDigits: 2 })}`;
  }

  return `${formattedDate}, ${hoursMinutes} ${hours < 12 ? 'a.m.' : 'p.m.'}`;
}


function createDocumentLink(data) {
  const docFrag = document.createDocumentFragment();

  const docLink = document.createElement('a');
  docLink.classList.add('document-link');
  docLink.setAttribute('href', data.filename);
  const timeText = document.createTextNode(formatDateTime(data.created_at));
  docLink.appendChild(timeText);

  docFrag.appendChild(docLink);

  const emptyDocumentList = docContainer.querySelector('.empty-document-list');

  if (emptyDocumentList) {
    docContainer.replaceChild(docFrag, emptyDocumentList);
  } else {
    docContainer.insertBefore(docFrag, docContainer.firstChild);
  }
}


async function fetchLatestStarWarsData(e) {
  e.preventDefault();

  const headers = {
    ...defaultHeaders,
    "X-CSRFToken": document.querySelector('input[name="csrfmiddlewaretoken"]').value,
  };

  loader.classList.remove('loader--hidden');

  try {
    const response = await fetch(e.currentTarget.action, {
      method: 'POST',
      headers
    });

    if (!response.ok) {
      await Promise.reject(response);
    }

    const data = await response.json();
    createDocumentLink(data);
  } catch (err) {
    console.log(err);
  }

  loader.classList.add('loader--hidden');
}


function addTablePageData(pageData) {
  const docFrag = document.createDocumentFragment();

  pageData.forEach(row => {
    const tableRow = document.createElement('tr');
    tableRow.classList.add('table__row');

    row.forEach(val => {
      const rowCell = tableRow.insertCell(-1);
      rowCell.appendChild(document.createTextNode(val));
    })

    docFrag.appendChild(tableRow);
  })

  docTableBody.appendChild(docFrag);
}


async function fetchTableNextPageData(e) {
  e.preventDefault();

  const form = e.currentTarget;

  try {
    const response = await fetch(form.action, { headers: defaultHeaders });

    if (!response.ok) {
      await Promise.reject(response);
    }

    const data = await response.json();
    addTablePageData(data.page_results);

    if (data.has_next) {
      form.action = `?page=${data.page_number + 1}`;
    } else {
      tablePaginatorForm.style.display = 'none';
    }
  } catch (err) {
    console.log(err);
  }
}


function handleTallyBtnClick(e) {
  e.target.classList.toggle('tally__btn--selected');
}


function updateDocumentTableHead(header) {
  const docFrag = document.createDocumentFragment();

  const tableRow = document.createElement('tr');
  tableRow.classList.add('table__row');
  header.forEach(val => {
    const tableHeading = document.createElement('th');
    tableHeading.classList.add('table__header');
    tableHeading.appendChild(document.createTextNode(val));

    tableRow.appendChild(tableHeading);
  })

  docFrag.appendChild(tableRow);
  docTableHead.innerHTML = '';
  docTableHead.appendChild(docFrag);
}


function updateDocumentTableBody(results) {
  docFrag = document.createDocumentFragment();

  results.forEach(row => {
    const tableRow = document.createElement('tr');
    tableRow.classList.add('table__row');

    row.forEach(val => {
      const rowCell = tableRow.insertCell(-1)
      rowCell.appendChild(document.createTextNode(val));
    })

    docFrag.appendChild(tableRow);
  })

  docTableBody.innerHTML = '';
  docTableBody.appendChild(docFrag);
}


async function getTableValueCount(e) {
  e.preventDefault();

  const tallyFields = [];
  for (const btn of document.querySelectorAll('.tally__btn--selected')) {
    tallyFields.push(btn.innerText);
  }

  let url = new URL(e.currentTarget.action);
  url.search = new URLSearchParams({ fields: tallyFields }).toString();

  history.pushState(null, '', url);

  try {
    const response = await fetch(url, { headers: defaultHeaders });

    if (!response.ok) {
      await Promise.reject(response);
    }

    const { header, results } = await response.json();
    updateDocumentTableHead(header);
    updateDocumentTableBody(results);
  } catch (err) {
    console.log(err);
  }
}


if (docForm) {
  docForm.addEventListener('submit', fetchLatestStarWarsData, false);
}

if (tablePaginatorForm) {
  tablePaginatorForm.addEventListener('submit', fetchTableNextPageData, false);
}

tallyBtnList.forEach(btn => btn.addEventListener('click', handleTallyBtnClick, false));

if (tallyForm) {
  tallyForm.addEventListener('submit', getTableValueCount, false);
}
