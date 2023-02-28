from itertools import chain

from django.conf import settings
from django.db import models

# Create your models here.


class CSVDocument(models.Model):
    filename = models.CharField(max_length=50)
    filepath = models.FilePathField(path=settings.MEDIA_ROOT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.filename

    def to_dict(self):
        opts = self._meta
        data = {
            f.name: f.value_from_object(self)
            for f in chain(opts.concrete_fields, opts.private_fields, opts.many_to_many)
        }

        return data
