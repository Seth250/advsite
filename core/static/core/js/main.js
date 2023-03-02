const loader = document.getElementById('loader');

const docForm = document.querySelector('.collection__form');

const tablePaginatorForm = document.querySelector('.table-paginator-form');

const docTableBody = document.getElementById('document-table-body');

const docContainer = document.querySelector('.document-container');

const defaultHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json; charset=UTF-8",
  "X-Requested-With": "XMLHttpRequest",
};


function formatDateTime(dateTimeString) {
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


function addTablePageData(element, pageData) {
  if (!element) {
    return;
  }

  const docFrag = document.createDocumentFragment();

  pageData.forEach(row => {
    const tableRow = document.createElement('tr');
    tableRow.classList.add('table__row');

    row.forEach(val => {
      const rowCell = tableRow.insertCell(-1)
      rowCell.appendChild(document.createTextNode(val));
    })

    docFrag.appendChild(tableRow);
  })

  element.appendChild(docFrag);
}


async function fetchNextPageData(e) {
  e.preventDefault();

  const form = e.currentTarget;

  try {
    const response = await fetch(form.action, { headers: defaultHeaders });

    if (!response.ok) {
      await Promise.reject(response);
    }

    const data = await response.json();
    addTablePageData(docTableBody, data.page_results);

    if (data.has_next) {
      form.action = `?page=${data.page_number + 1}`;
    } else {
      tablePaginatorForm.style.display = 'none';
    }
  } catch (err) {
    console.log(err);
  }
}

if (docForm) {
  docForm.addEventListener('submit', fetchLatestStarWarsData, false);
}

if (tablePaginatorForm) {
  tablePaginatorForm.addEventListener('submit', fetchNextPageData, false);
}
