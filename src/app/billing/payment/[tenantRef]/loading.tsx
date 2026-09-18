import "../../../landing.css";
import "./payment.css";

/**
 * Loading state for the payment screen.
 *
 * A spinner and a sentence about checking — deliberately emphatic about what is
 * happening ("checking", not "confirming"), because a loading animation on a
 * payment page is the easiest place in an app to imply success that has not
 * been established. No check marks appear here.
 */
export default function PaymentLoading() {
  return (
    <div className="of-landing">
      <div className="of-pay">
        <main className="of-pay-main">
          <section className="of-pay-card" aria-busy="true" aria-live="polite">
            <span className="of-pay-icon" data-tone="pending" aria-hidden>
              <span className="of-pay-spinner" />
            </span>
            <p className="of-pay-kicker">Payment</p>
            <h1 className="of-pay-title">Checking payment status…</h1>
            <p className="of-pay-body">
              Reading your order from Openfield. This only takes a moment.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
