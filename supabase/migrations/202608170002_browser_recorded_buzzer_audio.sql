update storage.buckets
set allowed_mime_types = array[
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/webm'
]
where id = 'buzzer-sounds';
