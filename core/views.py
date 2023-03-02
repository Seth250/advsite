from __future__ import annotations

import csv

from django.core.paginator import Paginator
from django.http import Http404
from django.http.request import HttpRequest
from django.http.response import JsonResponse
from django.shortcuts import redirect, render
from django.utils.translation import gettext_lazy as _
from django.views.generic import ListView, View

from core.models import CSVDocument
from core.utils import ETLPipeline

# Create your views here.


class AjaxCheckMixin:

    @staticmethod
    def is_ajax(request: HttpRequest):
        return request.headers.get('X-Requested-With') == 'XMLHttpRequest'


class DocumentIndexView(AjaxCheckMixin, ListView):
    template_name = 'core/document_index.html'
    context_object_name = 'document_list'

    def get_queryset(self):
        return CSVDocument.objects.all()

    def post(self, request: HttpRequest, *args, **kwargs):
        etl = ETLPipeline()
        table = etl.extract_and_transform()
        document = etl.load(table)

        if self.is_ajax(request):
            return JsonResponse(document.to_dict())

        return redirect('core:document-index')


class DocumentDetailView(AjaxCheckMixin, View):
    paginate_by = 10
    paginator_class = Paginator

    def get_object(self):
        filename: str | None = self.kwargs.get('filename')

        try:
            return CSVDocument.objects.get(filename=filename)
        except CSVDocument.DoesNotExist:
            raise Http404('No CSVDocument matches the given query.')

    def get(self, request: HttpRequest, *args, **kwargs):
        obj = self.get_object()

        with open(obj.filepath, 'r') as file:
            reader = csv.reader(file)
            header = next(reader)
            rows = list(reader)

        paginator = self.paginator_class(rows, self.paginate_by)
        page = request.GET.get('page') or 1

        try:
            page_number = int(page)
        except ValueError:
            if page != 'last':
                raise Http404(_('Page is not "last", nor can it be converted to an int.'))

            page_number = paginator.num_pages

        page = paginator.page(page_number)
        page_results = page.object_list

        if self.is_ajax(request):
            data = {
                'page_results': page_results,
                'page_number': page_number,
                'has_next': page.has_next(),
            }
            return JsonResponse(data)

        context = {
            'filename': obj.filename,
            'header': header,
            'paginator': paginator,
            'page_obj': page,
            'page_results': page_results
        }

        return render(request, 'core/document_detail.html', context=context)
