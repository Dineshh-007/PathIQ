import axios from 'axios';
async function test() {
  try {
    const res = await axios.post('http://localhost:3001/api/auth/login', { email: 'test@example.com', password: 'password' });
    console.log(res.status, res.data);
  } catch (e: any) {
    console.error(e.response?.status, e.response?.data);
  }
}
test();
