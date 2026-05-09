export default function Footer() {
    return (
        <footer className="container">
            <div className="footer">
                <span className="footer__text">Built by Noah · {new Date().getFullYear()}</span>
            </div>
        </footer>
    );
}