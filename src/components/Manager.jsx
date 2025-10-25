import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FaceAuth from "./FaceAuth.jsx";


const Manager = () => {
  const [form, setForm] = useState({ site: "", username: "", password: "" });
  const [passwordArray, setPasswordArray] = useState([]);
  
  const [showPassword, setShowPassword] = useState(false); // default: mask password input
  // Face auth state
  const [authVisible, setAuthVisible] = useState(false);
  const [authMode, setAuthMode] = useState('verify'); // 'enroll' before add, 'verify' before redirect
  const afterAuthRef = React.useRef(null); // holds a function to run after successful auth

 const getPasswords = async() => {
  try {
    const req = await fetch("http://localhost:3000/")
    const savedPasswords = await req.json()
    setPasswordArray(savedPasswords)
    console.log(savedPasswords)
  } catch (err) {
    console.warn('Backend not reachable, falling back to localStorage. Error:', err?.message || err)
    const local = localStorage.getItem('passwords')
    if (local) {
      try {
        setPasswordArray(JSON.parse(local))
      } catch {}
    }
  }
 }
  useEffect(() => {
    getPasswords()
  },[])
   

  // Handle input changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Password validation
  const validatePassword = (pw) => {
    // Rules: min 8 chars, must contain upper, lower, number, special
    const minLength = pw.length >= 8
    const hasUpper = /[A-Z]/.test(pw)
    const hasLower = /[a-z]/.test(pw)
    const hasDigit = /\d/.test(pw)
    const hasSpecial = /[^A-Za-z0-9]/.test(pw)
    return { minLength, hasUpper, hasLower, hasDigit, hasSpecial, ok: minLength && hasUpper && hasLower && hasDigit && hasSpecial }
  }

  // Save new password with face enrollment before adding
  const actuallySavePassword = () => {
    const updatedPasswords = [...passwordArray, form];
    setPasswordArray(updatedPasswords);
    localStorage.setItem("passwords", JSON.stringify(updatedPasswords));
    setForm({ site: "", username: "", password: "" }); // clear form
    toast.success('Password added');
  }

  const savePassword = () => {
    if (!form.site || !form.username || !form.password) {
      toast.error('Please fill all fields');
      return;
    }
    // validate password
    const v = validatePassword(form.password)
    if (!v.ok) {
      const messages = []
      if (!v.minLength) messages.push('at least 8 characters')
      if (!v.hasUpper) messages.push('an uppercase letter')
      if (!v.hasLower) messages.push('a lowercase letter')
      if (!v.hasDigit) messages.push('a number')
      if (!v.hasSpecial) messages.push('a special character')
      toast.error(`Password must contain ${messages.join(', ')}`)
      return
    }
    // Trigger face enrollment, then save
    afterAuthRef.current = actuallySavePassword;
    setAuthMode('enroll');
    setAuthVisible(true);
  };

  const copyText = (text) =>{
    toast('copy to clipboard', {
position: "top-center",
autoClose: 3000,
hideProgressBar: false,
closeOnClick: false,
pauseOnHover: true,
draggable: true,
progress: undefined,
theme: "light",

});
    navigator.clipboard.writeText(text)
  }

  // Clear all passwords
  const clearAllPasswords = () => {
    localStorage.removeItem("passwords");
    setPasswordArray([]);
  };

  // Handle site click: verify face before redirect
  const handleSiteClick = (e, site) => {
    e.preventDefault();
    afterAuthRef.current = () => {
      window.open(site, '_blank', 'noopener');
    };
    setAuthMode('verify');
    setAuthVisible(true);
  };

  const handleAuthSuccess = () => {
    setAuthVisible(false);
    if (afterAuthRef.current) {
      const fn = afterAuthRef.current;
      afterAuthRef.current = null;
      fn();
    }
  };

  return (
    <>
    <ToastContainer
position="top-right"
autoClose={5000}
hideProgressBar={false}
newestOnTop={false}
closeOnClick={false}
rtl={false}
pauseOnFocusLoss
draggable
pauseOnHover
theme="light"

/>
      {/* Background circles */}
      <div className="absolute top-0 -z-10 h-full w-full bg-green-100">
        <div className="absolute bottom-auto left-auto right-0 top-0 h-[500px] w-[500px] -translate-x-[30%] translate-y-[20%] rounded-full bg-[rgba(136,244,109,0.5)] opacity-50 blur-[80px]"></div>
      </div>

      <div className="p-2 md:0 md:mycontainer min-h-[80vh] ">
        {/* Header */}
        <h1 className="text-4xl font-bold text-center mb-2">
          <span className="text-green-600">&lt;</span>Pass
          <span className="text-green-500">Op/&gt;</span>
        </h1>
        <p className="text-green-900 text-lg text-center mb-6">
          Your own password manager
        </p>

        {/* Form */}
        <div className="flex flex-col gap-4 max-w-xl mx-auto">
          <input
            value={form.site}
            onChange={handleChange}
            placeholder="Enter website URL"
            className="rounded-full border border-green-500 w-full p-3"
            type="text"
            name="site"
          />
          <input
            value={form.username}
            onChange={handleChange}
            placeholder="Enter Username"
            className="rounded-full border border-green-500 w-full p-3"
            type="text"
            name="username"
          />

          {/* ✅ Password input (modified part) */}
          <div className="relative">
            <input
              value={form.password}
              onChange={handleChange}
              placeholder="Enter Password"
              className="rounded-full border border-green-500 w-full p-3"
              type={showPassword ? "text" : "password"} // ✅ show actual text by default
              name="password"
            />
            <span
              className="absolute right-3 top-2 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)} // ✅ toggle visibility
            >
              {showPassword ? "🙈" : "👁️"} {/* ✅ change icon based on state */}
            </span>
          </div>

          <button
            onClick={savePassword}
            className="bg-green-500 hover:bg-green-400 text-black rounded-full px-4 py-2 w-fit mx-auto"
          >
            Add password
          </button>
          <button
            onClick={clearAllPasswords}
            className="bg-red-500 hover:bg-red-400 text-white rounded-full px-4 py-2 w-fit mx-auto"
          >
            Clear All Passwords
          </button>
        </div>

        {/* Password table */}
        <div className="passwords flex justify-center mt-6">
          <div className="w-full max-w-3xl">
            <h2 className="text-2xl font-bold py-4">Your passwords</h2>

            { passwordArray.length === 0 && (
              <div className=" py-2 text-gray-700">No passwords to show</div>
            )}

            {passwordArray.length !== 0 && (
              <table className="table-auto w-full rounded-lg overflow-hidden border border-green-300 shadow">
                <thead className="bg-green-800 text-white">
                  <tr>
                    <th className="border border-white py-2">Site</th>
                    <th className="border border-white py-2">Username</th>
                    <th className="border border-white py-2">Password</th>
                  </tr>
                </thead>
                <tbody className="bg-green-100">
                  {passwordArray.map((item, index) => (
                    <tr key={index}>
                      <td className="  border border-white py-2 text-center">
                        <div className="flex justify-center items-center">
                          <a
                            href={item.site}
                            onClick={(e) => handleSiteClick(e, item.site)}
                          >
                            <span className="underline text-blue-700">{item.site}</span>
                          </a>
                          <div className="lordiconcopy size-7 cursor-pointer" onClick={()=>{copyText(item.site)}}>
                            <lord-icon
                              style={{
                                width: "25px",
                                height: "25px",
                                paddingTop: "3px",
                                paddingLeft: "3px",
                              }}
                              src="https://cdn.lordicon.com/iykgtsbt.json"
                              trigger="hover"
                            ></lord-icon>
                          </div>
                        </div>
                      </td>
                      <td className="flex justify-center items-center border border-white py-2 text-center">
                        <div className="flex justify-center items-center">
                          <span>{item.username}</span>
                          <div className="lordiconcopy size-7 cursor-pointer" onClick={()=>{copyText(item.username)}}>
                            <lord-icon
                              style={{
                                width: "25px",
                                height: "25px",
                                paddingTop: "3px",
                                paddingLeft: "3px",
                              }}
                              src="https://cdn.lordicon.com/iykgtsbt.json"
                              trigger="hover"
                            ></lord-icon>
                          </div>
                        </div>
                      </td>
                      <td className=" border border-white py-2 text-center">
                        <div className="flex justify-center items-center">
                          {/* Masked password - do not reveal length to avoid side-channel */}
                          <span>••••••••</span>
                          <div className="lordiconcopy size-7 cursor-pointer" onClick={()=>{copyText(item.password)}}>
                            <lord-icon
                              style={{
                                width: "25px",
                                height: "25px",
                                paddingTop: "3px",
                                paddingLeft: "3px",
                              }}
                              src="https://cdn.lordicon.com/iykgtsbt.json"
                              trigger="hover"
                            ></lord-icon>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      {authVisible && (
        <FaceAuth
          mode={authMode}
          threshold={0.6}
          onSuccess={handleAuthSuccess}
          onFail={(info) => {
            if (!info || !info.reason) return;
            if (info.reason === 'mismatch') {
              toast.error(`Face not recognized${typeof info.distance === 'number' ? ` (distance: ${info.distance.toFixed(3)})` : ''}`);
            } else if (info.reason === 'no_face') {
              toast.error('No face detected. Please align your face in frame and try again.');
            } else if (info.reason === 'no_enrollment') {
              toast.error('No enrolled face found. Please enroll first.');
            } else {
              toast.error('Face scan failed. Please try again.');
            }
          }}
          onCancel={() => {
            setAuthVisible(false);
            afterAuthRef.current = null;
          }}
        />
      )}
    </>
  );
};

export default Manager;
