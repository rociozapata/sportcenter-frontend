import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Hero from "../../pages/Home/Hero";
import Services from "../../pages/Home/Services";
function Home(){

    return (
        <>
            <Navbar />
            <Hero />
            <Services />
            <Footer />
        </>
    )
}

export default Home