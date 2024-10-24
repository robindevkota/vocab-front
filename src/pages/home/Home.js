import React from "react";
import "./Home.scss";
import Footer from "../../components/footer/Footer";
import Header from "../../components/header/Header";
import loginImg from "../../assets/login.svg";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div>
      <section className="container hero">
        <div className="hero-text">
          <h2>Advanced Dictionary Management System</h2>
          <p>
            Build and manage your personal word collection with pronunciation, meanings, and examples.
          </p>
          <p>
            Utilize seamless CRUD operations, personalized word lists, and audio pronunciation integration.
          </p>
          <div className="hero-buttons --flex-start">
            <button className="--btn --btn-danger">
              <Link to="/register">Register</Link>
            </button>
            <button className="--btn --btn-primary">
              <Link to="/login">Login</Link>
            </button>
          </div>
        </div>

        <div className="hero-image">
          <img src={loginImg} alt="Dictionary Management" />
        </div>
      </section>
    </div>
  );
};

export default Home;
