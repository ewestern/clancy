import axios from "axios";

axios
  .post("http://localhost:3000/proxy/google/gmail.search?orgId=1234", {
    q: "test",
  })
  .then((res) => {
    console.log(res.data);
  })
  .catch((err) => {
    console.error(err);
  });
