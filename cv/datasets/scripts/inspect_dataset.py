import tarfile
import scipy.io
import os

desktop_db = r'C:\Users\ESSAKKI RAJA T  EV\OneDrive\Desktop\DB PAWPHILE'

with tarfile.open(os.path.join(desktop_db, 'images.tar'), 'r') as tar:
    members = tar.getmembers()
    breeds = set()
    for m in members:
        if m.isdir() and '-' in m.name:
            # name looks like Images/n02085620-Chihuahua
            basename = os.path.basename(m.name)
            if basename != 'Images':
                breeds.add(basename)
                
    for b in sorted(breeds):
        print(b)
