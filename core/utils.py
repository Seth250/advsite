from __future__ import annotations

import concurrent.futures
import logging
import math
import uuid
from pathlib import Path
from typing import TypedDict

from django.conf import settings

import petl as etl
import requests

from core.models import CSVDocument

logger = logging.getLogger(__name__)


BASE_URL = 'https://swapi.dev/api/people'
PAGE_SIZE = 10  # number of items per page, set by api


class SWCharactersResponse(TypedDict):
    count: int
    next: str | None
    previous: str | None
    results: list[dict[str, str | list[str]]]


class ETLPipeline:

    def __init__(self):
        self._max_workers = 18

    @staticmethod
    def _request(session: requests.Session, url: str, **kwargs):
        response = session.get(url, **kwargs)
        if not response.ok:
            logger.error(f'{url} failed with code {response.status_code} -> {response.text}')
            return None

        data: SWCharactersResponse = response.json()
        return data

    def fetch_star_wars_data(self):
        session = requests.Session()

        data = self._request(session, BASE_URL)
        if data is None:
            session.close()
            return []

        count = data['count']
        num_pages = math.ceil(count / PAGE_SIZE)

        results = [None] * count

        results[0:len(data['results'])] = data['results']
        results: list[dict[str, str | list[str]]]

        page_start = 2  # since we've already fetched data for the first page

        num_workers = min(num_pages - 1, self._max_workers)
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures_to_page = {
                executor.submit(self._request, session=session, url=BASE_URL, params={'page': page}): page
                for page in range(page_start, num_pages + 1)
            }
            for future in concurrent.futures.as_completed(futures_to_page):
                data = future.result()
                if data is None:
                    break

                page = futures_to_page[future]
                start_index = (page - 1) * PAGE_SIZE
                end_index = start_index + len(data['results'])

                results[start_index:end_index] = data['results']

        session.close()
        return results

    @staticmethod
    def _fetch_homeworld_name(url: str):
        response = requests.get(url)
        if not response.ok:
            logger.error(f'{url} failed with code {response.status_code} -> {response.text}')
            return None

        name: str = response.json()['name']
        return name

    def extract_and_transform(self):
        results = self.fetch_star_wars_data()

        fields = ['name', 'height', 'mass', 'hair_color', 'skin_color', 'eye_color', 'birth_year', 'gender',
                  'homeworld', 'edited']

        dt_parser = etl.datetimeparser('%Y-%m-%dT%H:%M:%S.%fZ')

        table = (
            etl.fromdicts(results, header=fields)
               .convert('edited', lambda val: dt_parser(val).strftime('%Y-%m-%d'))
               .rename('edited', 'date')
        )

        homeworld_set: set[str] = set(table.values('homeworld'))
        with concurrent.futures.ThreadPoolExecutor(max_workers=self._max_workers) as executor:
            futures_to_url = {
                executor.submit(self._fetch_homeworld_name, url=url): url
                for url in homeworld_set
            }

            resolved_homeworlds = {
                futures_to_url[future]: future.result()
                for future in concurrent.futures.as_completed(futures_to_url)
            }

        return etl.convert(table, 'homeworld', resolved_homeworlds)

    @staticmethod
    def generate_random_csv_filename():
        return f'{uuid.uuid4().hex}.csv'

    def load(self, table):
        if not (dataset_path := Path(settings.MEDIA_ROOT)).exists():
            dataset_path.mkdir()

        filename = self.generate_random_csv_filename()
        filepath = str(dataset_path / filename)

        etl.tocsv(table, filepath)

        document = CSVDocument.objects.create(filename=filename, filepath=filepath)
        return document
