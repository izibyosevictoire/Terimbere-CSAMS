package rw.terimbere.csams.modules.loan.entity;

/**
 * Interest calculation type snapshotted onto each loan at creation.
 * <p>FLAT is fully supported: interest = principal × rate/100 for the loan term.
 * REDUCING uses a simple Phase-5 approximation: remaining principal × rate/100.
 */
public enum InterestType {
    FLAT,
    REDUCING
}
