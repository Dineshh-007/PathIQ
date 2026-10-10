import { prisma } from './apps/server/src/config/database';
import { signAccessToken } from './apps/server/src/middleware/auth';
async function test() {
  const user = await prisma.user.findFirst();
  if (!user) return console.log('No user');
  const token = signAccessToken({ id: user.id, name: user.name, email: user.email });
  
  const res = await fetch('http://localhost:3001/api/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await res.json();
  console.log(res.status, data);
}
test();
