import { useState, type FormEvent } from "react";


function Login(){
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const loginData = {
            email : email,
            password : password
        };

        if(loginData.ok){
            localStorage.setItem("token", loginData.token);
        }

    
    }
    return <section>Prueba</section>
}

export default Login;