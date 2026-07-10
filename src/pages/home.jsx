import './home.css';

export function Home() {
  return (
    <div className="home">

      <section className="hero container">

        <h1>
          Намери работа.<br />
          Намери правилния служител.
        </h1>

        <p>
          Reverse Job Platform за България.
        </p>

        <div className="hero-buttons">

          <button className="btn">
            Търся работа
          </button>

          <button className="btn btn-outline">
            Търся служители
          </button>

        </div>

      </section>

    </div>
  )
}