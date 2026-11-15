"""Dependency-free Oman Majd quiz server. Python 3.10+."""
import os,json,sqlite3,secrets,time,csv,io,hmac,mimetypes,threading
from psycopg import connect as pgconnect
from psycopg.rows import dict_row
from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parent
DB=os.getenv('DATABASE_PATH',str(ROOT/'data.sqlite3'))
DATABASE_URL=os.getenv('DATABASE_URL')
ADMIN=os.getenv('ADMIN_PASSWORD','')
Q={x['id']:x for x in json.loads((ROOT/'questions.json').read_text(encoding='utf8'))}
QUOTAS={'history':(2,4,2),'geography':(2,3,1),'heritage':(2,3,1),'development':(2,2,1),'landmarks':(1,3,1)}
LEVELS=('easy','medium','hard')
class PGConnection:
 def __init__(self):
  self.c=pgconnect(DATABASE_URL,row_factory=dict_row)
 def __enter__(self):return self
 def __exit__(self,typ,value,tb):
  try:
   if typ:self.c.rollback()
   else:self.c.commit()
  finally:self.c.close()
 def execute(self,sql,args=()):
  if sql.strip().upper()=='BEGIN IMMEDIATE':return None
  sql=sql.replace('?', '%s')
  if sql.startswith('INSERT OR IGNORE INTO settings VALUES'):
   sql="INSERT INTO settings(k,v) VALUES('status','closed') ON CONFLICT (k) DO NOTHING"
  return self.c.execute(sql,args)

def conn():
 if DATABASE_URL:return PGConnection()
 c=sqlite3.connect(DB,timeout=20);c.row_factory=sqlite3.Row;c.execute('PRAGMA journal_mode=WAL');return c

def init():
 if DATABASE_URL:
  with conn() as c:
   c.execute('CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY,v TEXT NOT NULL)')
   c.execute("""CREATE TABLE IF NOT EXISTS participants(
     token TEXT PRIMARY KEY,name TEXT,org TEXT,session TEXT UNIQUE,
     started DOUBLE PRECISION,finished DOUBLE PRECISION,score INTEGER DEFAULT 0,
     elapsed DOUBLE PRECISION,plan TEXT,pos INTEGER DEFAULT 0,
     deadline DOUBLE PRECISION,submitted TEXT DEFAULT '[]')""")
   c.execute("INSERT INTO settings(k,v) VALUES('status','closed') ON CONFLICT(k) DO NOTHING")
 else:
  with conn() as c:
   c.executescript("""CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY,v TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS participants(token TEXT PRIMARY KEY,name TEXT,org TEXT,session TEXT UNIQUE,started REAL,finished REAL,score INTEGER DEFAULT 0,elapsed REAL,plan TEXT,pos INTEGER DEFAULT 0,deadline REAL,submitted TEXT DEFAULT '[]');""")
   c.execute("INSERT OR IGNORE INTO settings VALUES('status','closed')")
def status(c):return c.execute("SELECT v FROM settings WHERE k='status'").fetchone()['v']
def current(c,session):return c.execute('SELECT * FROM participants WHERE session=?' + (' FOR UPDATE' if DATABASE_URL else ''),(session,)).fetchone() if session else None
def question(row):
 plan=json.loads(row['plan']);pos=row['pos']
 if pos>=len(plan):return None
 p=plan[pos];q=Q[p['id']]
 return {'number':pos+1,'total':30,'axis':q['axis'],'level':q['level'],'text':q['question'],'options':[q['options'][i] for i in p['order']],'deadline':row['deadline'],'server_time':time.time()}
def result(row):return {'name':row['name'],'org':row['org'],'score':row['score'],'correct':row['score']//10,'elapsed':row['elapsed'],'finished':bool(row['finished'])}
def advance(c,row,selected,now):
 p=json.loads(row['plan'])[row['pos']];q=Q[p['id']]
 valid=now<=row['deadline']+.75 and type(selected)==int and 0<=selected<4
 correct=valid and p['order'][selected]==q['answer']
 submitted=json.loads(row['submitted']);submitted.append({'id':p['id'],'answer':p['order'][selected] if valid else None,'correct':bool(correct)})
 pos=row['pos']+1;score=row['score']+(10 if correct else 0)
 c.execute('UPDATE participants SET pos=?,score=?,submitted=?,deadline=? WHERE token=?',(pos,score,json.dumps(submitted),now+30 if pos<30 else None,row['token']))
 if pos>=30:c.execute('UPDATE participants SET finished=?,elapsed=? WHERE token=?',(now,round(now-row['started'],2),row['token']))
def sync(c,row):
 now=time.time()
 while row and row['started'] and not row['finished'] and row['pos']<30 and now>row['deadline']+.75:
  advance(c,row,None,row['deadline']+.76)
  row=c.execute('SELECT * FROM participants WHERE token=?',(row['token'],)).fetchone()
 return row
class Handler(BaseHTTPRequestHandler):
 def respond(self,obj,code=200):
  raw=json.dumps(obj,ensure_ascii=False).encode('utf8');self.send_response(code);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
 def error(self,s,code=400):self.respond({'error':s},code)
 def data(self):
  try:
   size=int(self.headers.get('Content-Length','0'))
   if size>100000:return {}
   return json.loads(self.rfile.read(size) or b'{}')
  except (ValueError,json.JSONDecodeError):return {}
 def admin(self):return bool(ADMIN) and hmac.compare_digest(self.headers.get('X-Admin-Password',''),ADMIN)
 def file(self,path):
  target=ROOT/'static'/('admin.html' if path=='/admin' else 'index.html' if path=='/' else path.removeprefix('/static/'))
  if not target.resolve().is_relative_to((ROOT/'static').resolve()) or not target.is_file():return self.error('غير موجود',404)
  raw=target.read_bytes();self.send_response(200);self.send_header('X-Content-Type-Options','nosniff');self.send_header('X-Frame-Options','DENY');self.send_header('Referrer-Policy','no-referrer');self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");self.send_header('Content-Type',mimetypes.guess_type(str(target))[0] or 'application/octet-stream');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
 def do_GET(self):
  path=urlsplit(self.path).path
  if path in ('/','/admin') or path.startswith('/static/'):return self.file(path)
  if path=='/health':return self.respond({'ok':True})
  if path=='/api/status':
   with conn() as c:return self.respond({'status':status(c)})
  if path=='/api/me':
   with conn() as c:
    c.execute('BEGIN IMMEDIATE');row=current(c,self.headers.get('X-Session',''))
    if not row:return self.error('الجلسة غير موجودة',401)
    row=sync(c,row)
    return self.respond({'done':bool(row['finished']),'question':None if row['finished'] else question(row),'result':result(row) if row['finished'] else None})
  if path=='/api/leaderboard':
   with conn() as c:
    if status(c)!='closed':return self.error('يُعلن ترتيب الفائزين بعد إغلاق المسابقة',403)
    rows=c.execute('SELECT name,org,score,elapsed FROM participants WHERE finished IS NOT NULL ORDER BY score DESC,elapsed ASC,name ASC LIMIT 100').fetchall()
    return self.respond({'rows':[dict(r) for r in rows]})
  if path.startswith('/api/admin/'):
   if not self.admin():return self.error('كلمة مرور الإدارة غير صحيحة',401)
   with conn() as c:
    if path=='/api/admin/state':
     rows=c.execute('SELECT token,name,org,started,finished,score,elapsed FROM participants ORDER BY score DESC,elapsed ASC').fetchall()
     return self.respond({'status':status(c),'rows':[dict(r) for r in rows],'total_questions':len(Q)})
    if path=='/api/admin/export':
     rows=c.execute('SELECT token,name,org,score,elapsed,started,finished FROM participants ORDER BY score DESC,elapsed ASC').fetchall()
     buf=io.StringIO();writer=csv.writer(buf);writer.writerow(['الرمز','الاسم','جهة العمل','الدرجة','الوقت بالثواني','بداية المشاركة','نهاية المشاركة']);writer.writerows([[r['token'],r['name'],r['org'],r['score'],r['elapsed'],r['started'],r['finished']] for r in rows]);raw=('\ufeff'+buf.getvalue()).encode('utf8')
     self.send_response(200);self.send_header('Content-Type','text/csv; charset=utf-8');self.send_header('Content-Disposition','attachment; filename="oman_majd_results.csv"');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw);return
  self.error('غير موجود',404)
 def do_POST(self):
  path=urlsplit(self.path).path;data=self.data()
  if path.startswith('/api/admin/'):
   if not self.admin():return self.error('غير مصرح',401)
   if path=='/api/admin/status':
    v=data.get('status')
    if v not in ('open','closed'):return self.error('حالة غير صحيحة')
    with conn() as c:c.execute("UPDATE settings SET v=? WHERE k='status'",(v,))
    return self.respond({'status':v})
   if path=='/api/admin/tokens':
    try:n=int(data.get('count',0))
    except (ValueError,TypeError):return self.error('عدد غير صحيح')
    if not 1<=n<=500:return self.error('العدد بين 1 و500')
    created=[];alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    with conn() as c:
     for _ in range(n):
      while True:
       token=''.join(secrets.choice(alphabet) for _ in range(10))
       if not c.execute('SELECT 1 FROM participants WHERE token=?',(token,)).fetchone():break
      c.execute('INSERT INTO participants(token) VALUES(?)',(token,));created.append(token)
    return self.respond({'tokens':created})
  if path=='/api/start':
   token=str(data.get('token','')).strip().upper();name=str(data.get('name','')).strip();org=str(data.get('org','')).strip()
   if not (2<=len(name)<=100 and 2<=len(org)<=120):return self.error('أدخل الاسم وجهة العمل بشكل صحيح')
   with conn() as c:
    c.execute('BEGIN IMMEDIATE')
    if status(c)!='open':return self.error('المسابقة مغلقة حاليًا',403)
    row=c.execute('SELECT * FROM participants WHERE token=?' + (' FOR UPDATE' if DATABASE_URL else ''),(token,)).fetchone()
    if not row:return self.error('رمز المشاركة غير صحيح',403)
    if row['started']:return self.error('هذا الرمز مستخدم بالفعل؛ استعد جلستك من الجهاز الأصلي',409)
    plan=[];rng=secrets.SystemRandom()
    for axis,counts in QUOTAS.items():
     for level,n in zip(LEVELS,counts):
      pool=[q for q in Q.values() if q['axis']==axis and q['level']==level]
      for q in rng.sample(pool,n):
       order=list(range(4));rng.shuffle(order);plan.append({'id':q['id'],'order':order})
    rng.shuffle(plan);session=secrets.token_urlsafe(32);now=time.time()
    c.execute('UPDATE participants SET name=?,org=?,session=?,started=?,plan=?,deadline=? WHERE token=?',(name,org,session,now,json.dumps(plan),now+30,token))
    row=c.execute('SELECT * FROM participants WHERE token=?',(token,)).fetchone()
    return self.respond({'session':session,'question':question(row)})
  if path=='/api/answer':
   with conn() as c:
    c.execute('BEGIN IMMEDIATE');row=current(c,self.headers.get('X-Session',''))
    if not row:return self.error('الجلسة غير موجودة',401)
    row=sync(c,row)
    if row['finished']:return self.respond({'done':True,'result':result(row)})
    if data.get('number')!=row['pos']+1:return self.error('السؤال تغيّر؛ أعد تحميل السؤال',409)
    advance(c,row,data.get('selected'),time.time())
    row=c.execute('SELECT * FROM participants WHERE token=?',(row['token'],)).fetchone()
    return self.respond({'done':bool(row['finished']),'question':None if row['finished'] else question(row),'result':result(row) if row['finished'] else None})
  self.error('غير موجود',404)
if __name__=='__main__':
 init()
 if not ADMIN:print('تحذير: عيّن ADMIN_PASSWORD قبل استخدام لوحة الإدارة')
 host=os.getenv('HOST','127.0.0.1');port=int(os.getenv('PORT','5000'))
 print(f'عُمان المجد: http://{host}:{port}');ThreadingHTTPServer((host,port),Handler).serve_forever()
